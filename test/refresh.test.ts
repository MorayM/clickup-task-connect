import { describe, expect, it } from 'vitest';
import { refresh } from '../src/engine/engine';
import { FakeHost, json } from './fake-host';
import { BASE, DUE_OCT_3, listingUrl, settings, task, TEAM, withClickUp } from './clickup-fixtures';

describe('refresh', () => {
	it('creates a task note per assigned task with the default scaffold and all managed properties', async () => {
		const host = withClickUp(new FakeHost(), [
			task({
				id: 'abc123',
				name: 'Write the report',
				status: { status: 'in progress', type: 'custom' },
				due_date: DUE_OCT_3,
				priority: { priority: 'high' },
				list: { id: 'L1', name: 'Q4 work' },
				parent: 'par999',
				markdown_description: 'Some **detail**',
			}),
		]);

		const result = await refresh(host, settings(), 'manual');

		expect(result).toMatchObject({ ok: true, summary: { created: 1 } });
		expect(host.paths()).toEqual(['ClickUp/Write the report (abc123).md']);
		const note = host.note('ClickUp/Write the report (abc123).md');
		expect(note.frontmatter).toEqual({
			'clickup-id': 'abc123',
			'clickup-url': 'https://app.clickup.com/t/abc123',
			'clickup-title': 'Write the report',
			'clickup-status': 'in progress',
			'clickup-due': '2026-10-03',
			'clickup-priority': 'high',
			'clickup-list': 'Q4 work',
			'clickup-parent': 'par999',
			'clickup-state': 'assigned',
		});
		expect(note.body).toBe(
			'[Open in ClickUp](https://app.clickup.com/t/abc123)\n\nSome **detail**\n\n## Notes\n',
		);
	});

	it('updates an existing note found by clickup-id in a subfolder, keeping its body and user keys', async () => {
		const host = withClickUp(new FakeHost(), [
			task({ id: 'abc123', name: 'Write the report', status: { status: 'review', type: 'custom' } }),
		]);
		host.addNote(
			'ClickUp/Reports/My report note.md',
			{ mine: 'keep me', 'clickup-id': ' abc123 ', 'clickup-status': 'to do', rating: 5 },
			'My own writing\n',
		);

		const result = await refresh(host, settings(), 'manual');

		expect(result).toMatchObject({ ok: true, summary: { created: 0, updated: 1 } });
		expect(host.paths()).toEqual(['ClickUp/Reports/My report note.md']);
		const note = host.note('ClickUp/Reports/My report note.md');
		expect(note.body).toBe('My own writing\n');
		expect(Object.keys(note.frontmatter ?? {}).slice(0, 4)).toEqual([
			'mine',
			'clickup-id',
			'clickup-status',
			'rating',
		]);
		expect(note.frontmatter).toMatchObject({
			mine: 'keep me',
			rating: 5,
			'clickup-id': 'abc123',
			'clickup-status': 'review',
			'clickup-title': 'Write the report',
			'clickup-due': null,
			'clickup-priority': null,
			'clickup-state': 'assigned',
		});
	});

	it('lists tasks from the workspace named by Workspace ID when the token sees several', async () => {
		const host = withClickUp(new FakeHost(), []);
		host.on(
			`${BASE}/team`,
			json(200, {
				teams: [
					{ id: TEAM, name: 'Acme' },
					{ id: '777', name: 'Side project' },
				],
			}),
		).on(listingUrl(0, '777'), json(200, { tasks: [task({ id: 'side1', name: 'Side task' })], last_page: true }));

		const result = await refresh(host, settings({ workspaceId: '777' }), 'manual');

		expect(result).toMatchObject({ ok: true, summary: { created: 1 } });
		expect(host.paths()).toEqual(['ClickUp/Side task (side1).md']);
	});

	it('restores a managed key the user deleted, and reports an unchanged note as up to date', async () => {
		const host = withClickUp(new FakeHost(), [task({ id: 'abc123', name: 'Write the report' })]);
		await refresh(host, settings(), 'manual');
		const path = 'ClickUp/Write the report (abc123).md';
		await host.processFrontMatter(path, (fm) => {
			delete fm['clickup-list'];
		});

		const restored = await refresh(host, settings(), 'manual');
		const again = await refresh(host, settings(), 'manual');

		expect(restored).toMatchObject({ ok: true, summary: { created: 0, updated: 1 } });
		expect(host.note(path).frontmatter).toMatchObject({ 'clickup-list': 'Backlog' });
		expect(again).toMatchObject({ ok: true, summary: { created: 0, updated: 0 } });
	});
});
