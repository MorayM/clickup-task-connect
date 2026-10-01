import { describe, expect, it } from 'vitest';
import { importTask } from '../src/engine/engine';
import { FakeHost, json } from './fake-host';
import { BASE, settings, task, taskUrl } from './clickup-fixtures';

function hostServing(id: string, response: ReturnType<typeof json> | 'network-error') {
	return new FakeHost()
		.on(`${BASE}/user`, json(200, { user: { id: 1001, username: 'Moray' } }))
		.on(taskUrl(id), response);
}

const ok = (fields: Parameters<typeof task>[0]) => json(200, task(fields));

describe('importTask', () => {
	it.each([
		['a bare ID', '  abc123 '],
		['a task URL', 'https://app.clickup.com/t/abc123'],
		['a task URL with a workspace', 'https://app.clickup.com/t/9001/abc123?comment=1'],
		['a URL without a scheme', 'app.clickup.com/t/abc123/'],
	])('creates a task note from %s', async (_name, input) => {
		const host = hostServing('abc123', ok({ id: 'abc123', name: 'Imported' }));

		const result = await importTask(host, settings(), input);

		expect(result).toEqual({ ok: true, path: 'ClickUp/Imported (abc123).md' });
		expect(host.note('ClickUp/Imported (abc123).md').frontmatter).toMatchObject({
			'clickup-id': 'abc123',
			'clickup-state': 'assigned',
		});
		expect(host.note('ClickUp/Imported (abc123).md').body).toContain('[Open in ClickUp](https://app.clickup.com/t/abc123)');
	});

	it.each([[''], ['hello world'], ['hello'], ['DEV-123'], ['https://example.com/page']])(
		'rejects %j without making a request',
		async (input) => {
			const host = hostServing('abc123', ok({ id: 'abc123', name: 'Imported' }));

			const result = await importTask(host, settings(), input);

			expect(result).toEqual({ ok: false, error: { kind: 'invalid-input' } });
			expect(host.requests).toEqual([]);
		},
	);

	it('updates and renames an existing note instead of creating another, keeping its body', async () => {
		const host = hostServing('abc123', ok({ id: 'abc123', name: 'New name' }));
		host.addNote(
			'ClickUp/Old name (abc123).md',
			{ 'clickup-id': 'abc123', 'clickup-title': 'Old name', 'clickup-state': 'closed' },
			'Mine\n',
		);

		const result = await importTask(host, settings(), 'abc123');

		expect(result).toEqual({ ok: true, path: 'ClickUp/New name (abc123).md' });
		expect(host.paths()).toEqual(['ClickUp/New name (abc123).md']);
		expect(host.note('ClickUp/New name (abc123).md')).toMatchObject({
			frontmatter: { 'clickup-state': 'assigned' },
			body: 'Mine\n',
		});
	});

	it.each([
		['a closed task', { status: { status: 'done', type: 'closed' } }, 'closed'],
		["a colleague's task", { assignees: [{ id: 5, username: 'Sam' }] }, 'not-assigned'],
	])('imports %s with the derived state', async (_name, fields, state) => {
		const host = hostServing('abc123', ok({ id: 'abc123', name: 'Theirs', ...fields }));

		await importTask(host, settings(), 'abc123');

		expect(host.note('ClickUp/Theirs (abc123).md').frontmatter?.['clickup-state']).toBe(state);
	});

	it('imports only the subtask, recording its parent', async () => {
		const host = hostServing('sub123', ok({ id: 'sub123', name: 'Sub', parent: 'par999' }));

		await importTask(host, settings(), 'sub123');

		expect(host.paths()).toEqual(['ClickUp/Sub (sub123).md']);
		expect(host.note('ClickUp/Sub (sub123).md').frontmatter?.['clickup-parent']).toBe('par999');
		expect(host.requests).not.toContain(taskUrl('par999'));
	});

	it.each([
		['a task that is not found', json(401, { ECODE: 'OAUTH_027' }), { kind: 'not-found' }],
		['a rejected token', json(401, { ECODE: 'OAUTH_025' }), { kind: 'bad-token' }],
		['ClickUp being unreachable', 'network-error' as const, { kind: 'offline' }],
		[
			'rate limiting',
			json(429, {}, { 'x-ratelimit-reset': String(Date.UTC(2026, 9, 1, 9, 0, 12) / 1000) }),
			{ kind: 'rate-limited', waitSeconds: 12 },
		],
	])('fails without creating a note on %s', async (_name, response, error) => {
		const host = hostServing('abc123', response);

		expect(await importTask(host, settings(), 'abc123')).toEqual({ ok: false, error });
		expect(host.paths()).toEqual([]);
	});

	it('names every note when the task ID is duplicated, before making a request', async () => {
		const host = hostServing('abc123', ok({ id: 'abc123', name: 'Dup' }));
		host.addNote('ClickUp/A.md', { 'clickup-id': 'abc123' });
		host.addNote('ClickUp/Sub/B.md', { 'clickup-id': 'abc123' });

		const result = await importTask(host, settings(), 'abc123');

		expect(result).toEqual({ ok: false, error: { kind: 'duplicates', paths: ['ClickUp/A.md', 'ClickUp/Sub/B.md'] } });
		expect(host.requests).toEqual([]);
	});

	it('fails when the scaffold note is missing', async () => {
		const host = hostServing('abc123', ok({ id: 'abc123', name: 'New' }));

		const result = await importTask(host, settings({ scaffoldPath: 'Missing.md' }), 'abc123');

		expect(result).toEqual({ ok: false, error: { kind: 'scaffold-missing', path: 'Missing.md' } });
		expect(host.paths()).toEqual([]);
	});

	it('fails when the scaffold frontmatter is not valid YAML', async () => {
		const host = hostServing('abc123', ok({ id: 'abc123', name: 'New' }));
		host.addNote('Bad.md', null, '---\nkey: [unclosed\n---\nBody');

		const result = await importTask(host, settings({ scaffoldPath: 'Bad.md' }), 'abc123');

		expect(result).toEqual({ ok: false, error: { kind: 'scaffold-invalid', path: 'Bad.md' } });
	});

	it('fails when the target path is taken by another file', async () => {
		const host = hostServing('abc123', ok({ id: 'abc123', name: 'New' }));
		host.addNote('ClickUp/New (abc123).md', null, 'Other\n');

		const result = await importTask(host, settings(), 'abc123');

		expect(result).toMatchObject({ ok: false, error: { kind: 'write-failed', path: 'ClickUp/New (abc123).md' } });
		expect(host.files.get('ClickUp/New (abc123).md')).toBe('Other\n');
	});

	it.each([
		['the vault still indexing', settings(), { kind: 'indexing' }, false],
		['no token', settings({ token: null }), { kind: 'no-token' }, true],
		['no folder', settings({ taskNoteFolder: '' }), { kind: 'invalid-folder' }, true],
	])('fails with no request on %s', async (_name, runSettings, error, indexReady) => {
		const host = hostServing('abc123', ok({ id: 'abc123', name: 'New' }));
		host.indexReady = indexReady;

		expect(await importTask(host, runSettings, 'abc123')).toEqual({ ok: false, error });
		expect(host.requests).toEqual([]);
	});
});
