import { describe, expect, it } from 'vitest';
import { refresh } from '../src/engine/engine';
import { FakeHost } from './fake-host';
import { settings, task, withClickUp } from './clickup-fixtures';

async function createdPathFor(name: string, id = 'abc123') {
	const host = withClickUp(new FakeHost(), [task({ id, name })]);
	await refresh(host, settings(), 'manual');
	return { host, paths: host.paths() };
}

describe('task note filenames', () => {
	it('removes characters that are illegal on some OS or break wikilinks, keeping the exact title', async () => {
		const name = '..Fix: a/b "quoted" #1 [link]^ref | what?*<>\\\tend\u0007... ';

		const { host, paths } = await createdPathFor(name);

		expect(paths).toEqual(['ClickUp/Fix ab quoted 1 linkref what end (abc123).md']);
		expect(host.note(paths[0]!).frontmatter?.['clickup-title']).toBe(name);
	});

	it('caps the name part at 100 characters without cutting the ID', async () => {
		const { paths } = await createdPathFor(`${'a'.repeat(99)} bcdef`, 'id42');

		expect(paths).toEqual([`ClickUp/${'a'.repeat(99)} (id42).md`]);
	});

	it('names a task with nothing left after cleaning by its ID alone', async () => {
		const { paths } = await createdPathFor(' [#?] ', 'xyz9');

		expect(paths).toEqual(['ClickUp/(xyz9).md']);
	});
});

const noteFor = (id: string, title: string, extra: Record<string, unknown> = {}) => ({
	'clickup-id': id,
	'clickup-title': title,
	'clickup-state': 'assigned',
	...extra,
});

describe('renaming task notes', () => {
	it('renames a note, keeping its subfolder, when the task is renamed in ClickUp', async () => {
		const host = withClickUp(new FakeHost(), [task({ id: 'abc123', name: 'New: name' })]);
		host.addNote('ClickUp/Sub/Old name (abc123).md', noteFor('abc123', 'Old name'), 'Body\n');

		const result = await refresh(host, settings(), 'manual');

		expect(result).toMatchObject({ ok: true, summary: { renamed: 1, updated: 0 } });
		expect(host.paths()).toEqual(['ClickUp/Sub/New name (abc123).md']);
		expect(host.note('ClickUp/Sub/New name (abc123).md')).toMatchObject({
			frontmatter: { 'clickup-title': 'New: name' },
			body: 'Body\n',
		});
	});

	it("keeps a filename the user chose, updating only clickup-title", async () => {
		const host = withClickUp(new FakeHost(), [task({ id: 'abc123', name: 'New name' })]);
		host.addNote('ClickUp/My own name.md', noteFor('abc123', 'Old name'));

		const result = await refresh(host, settings(), 'manual');

		expect(result).toMatchObject({ ok: true, summary: { renamed: 0, updated: 1 } });
		expect(host.paths()).toEqual(['ClickUp/My own name.md']);
		expect(host.note('ClickUp/My own name.md').frontmatter?.['clickup-title']).toBe('New name');
	});

	it('keeps the current name silently when the new name is taken', async () => {
		const host = withClickUp(new FakeHost(), [task({ id: 'abc123', name: 'New name' })]);
		host.addNote('ClickUp/Old name (abc123).md', noteFor('abc123', 'Old name'));
		host.addNote('ClickUp/New name (abc123).md', null, 'Someone else’s file\n');

		const result = await refresh(host, settings(), 'manual');

		expect(result).toMatchObject({ ok: true, summary: { renamed: 0, updated: 1, failures: [] } });
		expect(host.paths()).toEqual(['ClickUp/New name (abc123).md', 'ClickUp/Old name (abc123).md']);
		expect(host.files.get('ClickUp/New name (abc123).md')).toBe('Someone else’s file\n');
	});
});

describe('creating over an existing file', () => {
	it('skips the task and reports the path, never writing to the existing file', async () => {
		const host = withClickUp(new FakeHost(), [task({ id: 'abc123', name: 'Report' })]);
		host.addNote('ClickUp/Report (abc123).md', { mine: true }, 'Not a task note\n');
		const before = host.files.get('ClickUp/Report (abc123).md');

		const result = await refresh(host, settings(), 'manual');

		expect(result).toMatchObject({
			ok: true,
			summary: { created: 0, failures: [{ path: 'ClickUp/Report (abc123).md' }] },
		});
		expect(host.files.get('ClickUp/Report (abc123).md')).toBe(before);
	});
});

describe('duplicates', () => {
	it('leaves a task alone when two notes claim its ID, and counts it', async () => {
		const host = withClickUp(new FakeHost(), [task({ id: 'abc123', name: 'New name' })]);
		host.addNote('ClickUp/Old name (abc123).md', noteFor('abc123', 'Old name'), 'One\n');
		host.addNote('ClickUp/Copy.md', noteFor('abc123', 'Old name'), 'Two\n');
		const before = new Map(host.files);

		const result = await refresh(host, settings(), 'manual');

		expect(result).toMatchObject({ ok: true, summary: { created: 0, updated: 0, renamed: 0, duplicates: 1 } });
		expect(host.files).toEqual(before);
	});
});
