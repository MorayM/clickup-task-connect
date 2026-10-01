import { describe, expect, it } from 'vitest';
import { listAssignedTaskNotes } from '../src/engine/engine';
import { FakeHost } from './fake-host';
import { settings } from './clickup-fixtures';

const taskNote = (id: string, state: string, due: string | null, extra: Record<string, unknown> = {}) => ({
	'clickup-id': id,
	'clickup-title': `Task ${id}`,
	'clickup-status': 'to do',
	'clickup-due': due,
	'clickup-list': 'Backlog',
	'clickup-state': state,
	...extra,
});

describe('listAssignedTaskNotes', () => {
	it('lists only assigned task notes, soonest due first and undated last', async () => {
		const host = new FakeHost()
			.addNote('ClickUp/a.md', taskNote('a1', 'assigned', null))
			.addNote('ClickUp/b.md', taskNote('b1', 'assigned', '2026-10-09', { 'clickup-list': 'Q4' }))
			.addNote('ClickUp/Sub/c.md', taskNote('c1', 'assigned', '2026-10-02'))
			.addNote('ClickUp/closed.md', taskNote('d1', 'closed', '2026-09-01'))
			.addNote('ClickUp/gone.md', taskNote('e1', 'gone', '2026-09-01'))
			.addNote('ClickUp/not-mine.md', taskNote('f1', 'not-assigned', '2026-09-01'))
			.addNote('ClickUp/plain.md', { title: 'Not a task note' })
			.addNote('ClickUp/dup1.md', taskNote('g1', 'assigned', '2026-09-01'))
			.addNote('ClickUp/dup2.md', taskNote('g1', 'assigned', '2026-09-01'))
			.addNote('Elsewhere/x.md', taskNote('h1', 'assigned', '2026-09-01'));

		const result = await listAssignedTaskNotes(host, settings());

		expect(result).toEqual({
			ok: true,
			notes: [
				{ path: 'ClickUp/Sub/c.md', id: 'c1', title: 'Task c1', status: 'to do', due: '2026-10-02', list: 'Backlog' },
				{ path: 'ClickUp/b.md', id: 'b1', title: 'Task b1', status: 'to do', due: '2026-10-09', list: 'Q4' },
				{ path: 'ClickUp/a.md', id: 'a1', title: 'Task a1', status: 'to do', due: null, list: 'Backlog' },
			],
		});
		expect(host.requests).toEqual([]);
	});

	it('fails while the vault is still indexing', async () => {
		const host = new FakeHost();
		host.indexReady = false;

		expect(await listAssignedTaskNotes(host, settings())).toEqual({ ok: false, error: { kind: 'indexing' } });
	});
});
