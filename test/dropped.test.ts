import { describe, expect, it } from 'vitest';
import { refresh } from '../src/engine/engine';
import { FakeHost, json } from './fake-host';
import { DUE_OCT_3, settings, task, taskUrl, withClickUp } from './clickup-fixtures';

const lastKnown = (id: string, state = 'assigned') => ({
	'clickup-id': id,
	'clickup-url': `https://app.clickup.com/t/${id}`,
	'clickup-title': `Task ${id}`,
	'clickup-status': 'in progress',
	'clickup-due': null,
	'clickup-priority': 'low',
	'clickup-list': 'Backlog',
	'clickup-parent': null,
	'clickup-state': state,
});

const path = (id: string) => `ClickUp/Task ${id} (${id}).md`;

function hostWithDropped(...ids: string[]) {
	const host = withClickUp(new FakeHost(), []);
	for (const id of ids) host.addNote(path(id), lastKnown(id), 'Body\n');
	return host;
}

describe('dropped tasks', () => {
	it('marks a closed task closed and rewrites its properties', async () => {
		const host = hostWithDropped('t1').on(
			taskUrl('t1'),
			json(200, task({ id: 't1', name: 'Task t1', status: { status: 'complete', type: 'closed' }, due_date: DUE_OCT_3 })),
		);

		const result = await refresh(host, settings(), 'manual');

		expect(result).toMatchObject({ ok: true, summary: { closed: 1, notAssigned: 0, gone: 0 } });
		expect(host.note(path('t1')).frontmatter).toMatchObject({
			'clickup-state': 'closed',
			'clickup-status': 'complete',
			'clickup-due': '2026-10-03',
			'clickup-priority': null,
		});
		expect(host.note(path('t1')).body).toBe('Body\n');
	});

	it('marks an open task assigned to someone else not-assigned', async () => {
		const host = hostWithDropped('t1').on(
			taskUrl('t1'),
			json(200, task({ id: 't1', name: 'Task t1', assignees: [{ id: 5, username: 'Sam' }] })),
		);

		const result = await refresh(host, settings(), 'manual');

		expect(result).toMatchObject({ ok: true, summary: { notAssigned: 1 } });
		expect(host.note(path('t1')).frontmatter).toMatchObject({
			'clickup-state': 'not-assigned',
			'clickup-status': 'to do',
		});
	});

	it.each([
		['OAUTH_027', json(401, { err: 'Team not authorized', ECODE: 'OAUTH_027' })],
		['a 404', json(404, { err: 'Task not found', ECODE: 'ITEM_015' })],
	])('marks a task gone on %s, keeping its last known properties', async (_name, response) => {
		const host = hostWithDropped('t1').on(taskUrl('t1'), response);

		const result = await refresh(host, settings(), 'manual');

		expect(result).toMatchObject({ ok: true, summary: { gone: 1 } });
		expect(host.note(path('t1')).frontmatter).toEqual({ ...lastKnown('t1'), 'clickup-state': 'gone' });
	});

	it.each([
		['rate limiting', json(429, {}, { 'X-RateLimit-Reset': String(Date.UTC(2026, 9, 1, 9, 0, 30) / 1000) }), { kind: 'rate-limited', waitSeconds: 30 }],
		['a network error', 'network-error' as const, { kind: 'offline' }],
		['a rejected token', json(401, { ECODE: 'OAUTH_025' }), { kind: 'bad-token' }],
	])('stops classifying on %s, leaving the rest assigned for next time', async (_name, response, error) => {
		const host = hostWithDropped('t1', 't2', 't3')
			.on(taskUrl('t1'), json(200, task({ id: 't1', name: 'Task t1', status: { status: 'done', type: 'closed' } })))
			.on(taskUrl('t2'), response)
			.on(taskUrl('t3'), json(200, task({ id: 't3', name: 'Task t3', status: { status: 'done', type: 'closed' } })));

		const result = await refresh(host, settings(), 'manual');

		expect(result).toMatchObject({ ok: true, summary: { closed: 1, interrupted: error } });
		expect(host.note(path('t2')).frontmatter).toEqual(lastKnown('t2'));
		expect(host.note(path('t3')).frontmatter).toEqual(lastKnown('t3'));
		expect(host.requests).not.toContain(taskUrl('t3'));
	});

	it('never fetches notes that are already closed, not-assigned or gone', async () => {
		const host = withClickUp(new FakeHost(), []);
		host.addNote(path('c1'), lastKnown('c1', 'closed'));
		host.addNote(path('n1'), lastKnown('n1', 'not-assigned'));
		host.addNote(path('g1'), lastKnown('g1', 'gone'));

		const result = await refresh(host, settings(), 'manual');

		expect(result).toMatchObject({ ok: true, summary: { closed: 0, notAssigned: 0, gone: 0 } });
		expect(host.requests.some((url) => url.includes('/v2/task/'))).toBe(false);
	});

	it('still checks a note whose clickup-state the user deleted', async () => {
		const host = withClickUp(new FakeHost(), []).on(taskUrl('t1'), json(404, {}));
		const { 'clickup-state': _state, ...withoutState } = lastKnown('t1');
		host.addNote(path('t1'), withoutState);

		await refresh(host, settings(), 'manual');

		expect(host.note(path('t1')).frontmatter?.['clickup-state']).toBe('gone');
	});

	it('does not classify duplicates', async () => {
		const host = hostWithDropped('t1');
		host.addNote('ClickUp/Copy.md', lastKnown('t1'));

		await refresh(host, settings(), 'manual');

		expect(host.requests).not.toContain(taskUrl('t1'));
	});

	it('returns a task that is assigned again to assigned', async () => {
		const host = withClickUp(new FakeHost(), [task({ id: 't1', name: 'Task t1' })]);
		host.addNote(path('t1'), lastKnown('t1', 'not-assigned'));

		const result = await refresh(host, settings(), 'manual');

		expect(result).toMatchObject({ ok: true, summary: { updated: 1 } });
		expect(host.note(path('t1')).frontmatter?.['clickup-state']).toBe('assigned');
	});
});
