import { describe, expect, it } from 'vitest';
import { refresh } from '../src/engine/engine';
import { FakeHost } from './fake-host';
import { DUE_OCT_3, settings, task, withClickUp } from './clickup-fixtures';

const SCAFFOLD = 'Templates/Task scaffold.md';

const richTask = task({
	id: 'abc123',
	name: 'Fix: "quotes" # and more',
	status: { status: 'in progress', type: 'custom' },
	due_date: DUE_OCT_3,
	start_date: String(Date.UTC(2026, 8, 30, 23, 30)),
	date_created: String(Date.UTC(2026, 8, 1, 12)),
	priority: { priority: 'urgent' },
	list: { id: 'L1', name: 'Q4: work' },
	folder: { id: 'F1', name: 'Projects', hidden: false },
	space: { id: 'S1', name: 'Engineering' },
	parent: 'par999',
	assignees: [
		{ id: 1001, username: 'Moray' },
		{ id: 5, username: 'Sam Smith' },
	],
	creator: { id: 5, username: 'Sam Smith' },
	tags: [{ name: 'backend' }, { name: 'urgent fix' }],
	markdown_description: 'Line one\n\n![img](https://example.com/a.png)',
});

async function renderWith(scaffold: string, clickUpTask = richTask) {
	const host = withClickUp(new FakeHost(), [clickUpTask]);
	host.addNote(SCAFFOLD, null, scaffold);
	const result = await refresh(host, settings({ scaffoldPath: SCAFFOLD }), 'manual');
	const path = host.paths().find((p) => p.startsWith('ClickUp/'));
	return { host, result, note: path ? host.note(path) : undefined };
}

describe('custom scaffold', () => {
	it('fills every placeholder in the body', async () => {
		const tokens = [
			'id', 'url', 'title', 'status', 'due', 'priority', 'list', 'parent', 'state',
			'description', 'space', 'folder', 'tags', 'assignees', 'creator', 'created', 'start', 'today',
		];

		const { note } = await renderWith(tokens.map((t) => `${t}={=ctc:${t}=}`).join('\n'));

		expect(note?.body.split('\n')).toEqual([
			'id=abc123',
			'url=https://app.clickup.com/t/abc123',
			'title=Fix: "quotes" # and more',
			'status=in progress',
			'due=2026-10-03',
			'priority=urgent',
			'list=Q4: work',
			'parent=par999',
			'state=assigned',
			'description=Line one',
			'',
			'![img](https://example.com/a.png)',
			'space=Engineering',
			'folder=Projects',
			'tags=backend, urgent fix',
			'assignees=Moray, Sam Smith',
			'creator=Sam Smith',
			'created=2026-09-01',
			'start=2026-10-01',
			'today=2026-10-01',
		]);
	});

	it('inserts the task JSON in a fenced block for raw', async () => {
		const { note } = await renderWith('{=ctc:raw=}');

		const match = /^```json\n([\s\S]*)\n```$/.exec(note?.body ?? '');
		expect(JSON.parse(match?.[1] ?? 'null')).toEqual(richTask);
	});

	it('leaves unknown placeholders and other template syntax as written, and empties known ones with no value', async () => {
		const plain = task({ id: 'p1', name: 'Plain' });

		const { note } = await renderWith('{=ctc:nope=} [{=ctc:parent=}] <% tp.date.now() %> {{date}}', plain);

		expect(note?.body).toBe('{=ctc:nope=} [] <% tp.date.now() %> {{date}}');
	});

	it('fills placeholders in frontmatter string values safely, with managed properties winning', async () => {
		const scaffold = [
			'---',
			'summary: "{=ctc:title=}"',
			'where: "{=ctc:list=} / {=ctc:space=}"',
			'tags:',
			'  - task',
			'  - "{=ctc:priority=}"',
			'clickup-status: mine',
			'count: 3',
			'---',
			'Body {=ctc:id=}',
		].join('\n');

		const { note } = await renderWith(scaffold);

		expect(note?.frontmatter).toMatchObject({
			summary: 'Fix: "quotes" # and more',
			where: 'Q4: work / Engineering',
			tags: ['task', 'urgent'],
			count: 3,
			'clickup-status': 'in progress',
			'clickup-title': 'Fix: "quotes" # and more',
		});
		expect(Object.keys(note?.frontmatter ?? {}).slice(0, 5)).toEqual([
			'summary',
			'where',
			'tags',
			'clickup-status',
			'count',
		]);
		expect(note?.body).toBe('Body abc123');
	});
});

describe('missing scaffold', () => {
	it.each([
		['missing', (_host: FakeHost) => {}],
		['unreadable', (host: FakeHost) => host.addNote(SCAFFOLD, null, 'x').unreadable.add(SCAFFOLD)],
	])('creates no notes when the scaffold is %s, still updates existing ones, and reports it once', async (_name, arrange) => {
		const host = withClickUp(new FakeHost(), [
			task({ id: 'new1', name: 'New one' }),
			task({ id: 'new2', name: 'New two' }),
			task({ id: 'old1', name: 'Renamed' }),
		]);
		arrange(host);
		host.addNote('ClickUp/Existing.md', { 'clickup-id': 'old1', 'clickup-title': 'Existing' });

		const result = await refresh(host, settings({ scaffoldPath: SCAFFOLD }), 'manual');

		expect(result).toMatchObject({ ok: true, summary: { created: 0, updated: 1, scaffoldMissing: SCAFFOLD } });
		expect(host.paths().filter((p) => p.startsWith('ClickUp/'))).toEqual(['ClickUp/Existing.md']);
		expect(host.note('ClickUp/Existing.md').frontmatter?.['clickup-title']).toBe('Renamed');
	});
});
