import { describe, expect, it } from 'vitest';
import { refresh } from '../src/engine/engine';
import { FakeHost, json } from './fake-host';
import { BASE, listingUrl, settings, task, TEAM, withClickUp } from './clickup-fixtures';

const tasks = (prefix: string, count: number) =>
	Array.from({ length: count }, (_, i) => task({ id: `${prefix}${i}`, name: `Task ${prefix}${i}` }));

describe('refresh listing', () => {
	it('fetches every page until last_page before writing', async () => {
		const host = withClickUp(new FakeHost(), [])
			.on(listingUrl(0), json(200, { tasks: tasks('a', 100), last_page: false }))
			.on(listingUrl(1), json(200, { tasks: tasks('b', 100), last_page: false }))
			.on(listingUrl(2), json(200, { tasks: tasks('c', 1), last_page: true }));

		const result = await refresh(host, settings(), 'manual');

		expect(result).toMatchObject({ ok: true, summary: { created: 201 } });
		expect(host.requests.filter((url) => url.includes('/task?'))).toEqual([
			listingUrl(0),
			listingUrl(1),
			listingUrl(2),
		]);
	});

	it('stops on a short page when the response has no last_page', async () => {
		const host = withClickUp(new FakeHost(), [])
			.on(listingUrl(0), json(200, { tasks: tasks('a', 100) }))
			.on(listingUrl(1), json(200, { tasks: tasks('b', 3) }));

		const result = await refresh(host, settings(), 'manual');

		expect(result).toMatchObject({ ok: true, summary: { created: 103 } });
		expect(host.requests).not.toContain(listingUrl(2));
	});

	it('changes nothing in the vault when a later page fails', async () => {
		const host = withClickUp(new FakeHost(), [])
			.on(listingUrl(0), json(200, { tasks: tasks('a', 100), last_page: false }))
			.on(listingUrl(1), 'network-error');
		host.addNote('ClickUp/Old (old1).md', { 'clickup-id': 'old1', 'clickup-state': 'assigned' }, 'Body\n');
		const before = new Map(host.files);

		const result = await refresh(host, settings(), 'manual');

		expect(result).toEqual({ ok: false, error: { kind: 'offline' } });
		expect(host.files).toEqual(before);
		expect(host.folders.size).toBe(0);
	});
});

describe('refresh errors', () => {
	const nowSeconds = Date.UTC(2026, 9, 1, 9) / 1000;
	const twoWorkspaces = json(200, {
		teams: [
			{ id: TEAM, name: 'Acme' },
			{ id: '777', name: 'Side project' },
		],
	});

	it.each([
		['no token on this device', settings({ token: null }), (h: FakeHost) => h, { kind: 'no-token' }],
		['an empty folder setting', settings({ taskNoteFolder: '  ' }), (h: FakeHost) => h, { kind: 'invalid-folder' }],
		['the vault root as folder', settings({ taskNoteFolder: '/' }), (h: FakeHost) => h, { kind: 'invalid-folder' }],
		[
			'the vault still indexing',
			settings(),
			(h: FakeHost) => Object.assign(h, { indexReady: false }),
			{ kind: 'indexing' },
		],
	])('fails with no requests for %s', async (_name, runSettings, arrange, error) => {
		const host = arrange(withClickUp(new FakeHost(), [task({ id: 'abc123', name: 'A task' })]));

		const result = await refresh(host, runSettings, 'manual');

		expect(result).toEqual({ ok: false, error });
		expect(host.requests).toEqual([]);
		expect(host.paths()).toEqual([]);
	});

	it.each([
		['a rejected token', `${BASE}/user`, json(401, { err: 'Token invalid', ECODE: 'OAUTH_025' }), { kind: 'bad-token' }],
		['any OAUTH error on the listing', listingUrl(0), json(401, { err: 'x', ECODE: 'OAUTH_019' }), { kind: 'bad-token' }],
		['ClickUp being unreachable', `${BASE}/team`, 'network-error' as const, { kind: 'offline' }],
		[
			'rate limiting',
			listingUrl(0),
			json(429, { err: 'Rate limit' }, { 'X-RateLimit-Reset': String(nowSeconds + 42) }),
			{ kind: 'rate-limited', waitSeconds: 42 },
		],
		['a server error', listingUrl(0), json(500, { err: 'Oops' }), { kind: 'http', status: 500 }],
		[
			'several workspaces with a blank ID',
			`${BASE}/team`,
			twoWorkspaces,
			{
				kind: 'several-workspaces',
				workspaces: [
					{ id: TEAM, name: 'Acme' },
					{ id: '777', name: 'Side project' },
				],
			},
		],
	])('fails without touching the vault on %s', async (_name, url, response, error) => {
		const host = withClickUp(new FakeHost(), [task({ id: 'abc123', name: 'A task' })]).on(url, response);
		host.clock = new Date(nowSeconds * 1000);

		const result = await refresh(host, settings(), 'manual');

		expect(result).toEqual({ ok: false, error });
		expect(host.paths()).toEqual([]);
	});

	it('fails when the Workspace ID is not one the token can see', async () => {
		const host = withClickUp(new FakeHost(), []).on(`${BASE}/team`, twoWorkspaces);

		const result = await refresh(host, settings({ workspaceId: '123' }), 'manual');

		expect(result).toEqual({ ok: false, error: { kind: 'workspace-not-found', id: '123' } });
	});

	it('makes no retries after a failure', async () => {
		const host = withClickUp(new FakeHost(), []).on(listingUrl(0), json(500, {}));

		await refresh(host, settings(), 'manual');

		expect(host.requests.filter((url) => url === listingUrl(0))).toHaveLength(1);
	});
});

describe('refresh write failures', () => {
	it('writes a new note and its properties in one go, so a note is never left without its clickup-id', async () => {
		const host = withClickUp(new FakeHost(), [task({ id: 'abc123', name: 'New' })]);
		host.failFrontmatterWrites.add('ClickUp/New (abc123).md');

		const result = await refresh(host, settings(), 'manual');

		expect(result).toMatchObject({ ok: true, summary: { created: 1, failures: [] } });
		expect(host.note('ClickUp/New (abc123).md').frontmatter).toMatchObject({
			'clickup-id': 'abc123',
			'clickup-state': 'assigned',
		});
	});

	it('keeps going when one note fails to write and reports it with its path', async () => {
		const host = withClickUp(new FakeHost(), [
			task({ id: 'bad1', name: 'Broken' }),
			task({ id: 'good1', name: 'Fine' }),
		]);
		host.failWrites.add('ClickUp/Broken (bad1).md');

		const result = await refresh(host, settings(), 'manual');

		expect(result).toMatchObject({
			ok: true,
			summary: { created: 1, failures: [{ path: 'ClickUp/Broken (bad1).md', message: 'Disk full' }] },
		});
		expect(host.paths()).toEqual(['ClickUp/Fine (good1).md']);
	});
});
