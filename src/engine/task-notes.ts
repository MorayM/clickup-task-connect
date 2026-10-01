// Creating and updating single task notes. Shared by refresh and import.

import { taskBasename } from './filename';
import type { HostPort, NoteInfo } from './host';
import { applyProperties, type ManagedProperties } from './properties';
import { placeholderValues, renderScaffold, type Scaffold } from './scaffold';
import type { ClickUpTask } from './types';

export type UpdateOutcome = 'renamed' | 'updated' | 'unchanged';

/** Thrown when a create's target path is already taken. */
export class PathTakenError extends Error {
	constructor(readonly path: string) {
		super('A file with this name already exists');
	}
}

export function newNotePath(folder: string, props: ManagedProperties): string {
	return `${folder}/${taskBasename(props['clickup-title'] ?? '', props['clickup-id'] ?? '')}.md`;
}

/**
 * Creates a task note from the rendered scaffold, with the managed properties after the
 * scaffold's frontmatter so they win. The file is written once, frontmatter included, so a
 * failure can't leave a note without its `clickup-id`. Never writes to an existing file.
 */
export async function createTaskNote(
	host: HostPort,
	folder: string,
	task: ClickUpTask,
	props: ManagedProperties,
	scaffold: Scaffold,
): Promise<string> {
	const path = newNotePath(folder, props);
	if (host.exists(path)) throw new PathTakenError(path);
	const rendered = renderScaffold(scaffold, placeholderValues(task, props, host.now(), host.timeZone()));
	if (!host.exists(folder)) await host.createFolder(folder);
	const frontmatter = { ...rendered.frontmatter };
	applyProperties(frontmatter, props);
	const yaml = host.stringifyYaml(frontmatter);
	await host.createFile(path, `---\n${yaml}${yaml.endsWith('\n') ? '' : '\n'}---\n${rendered.body}`);
	return path;
}

/**
 * Rewrites the managed properties of an existing note, then renames it when the task was
 * renamed and the note still has the name the plugin gave it. A taken name is kept silently.
 */
export async function updateTaskNote(
	host: HostPort,
	note: NoteInfo,
	props: Partial<ManagedProperties>,
): Promise<{ outcome: UpdateOutcome; path: string }> {
	let changed = false;
	await host.processFrontMatter(note.path, (fm) => {
		changed = applyProperties(fm, props);
	});

	const id = props['clickup-id'];
	const oldTitle = note.frontmatter?.['clickup-title'];
	const newTitle = props['clickup-title'];
	if (
		id &&
		newTitle !== undefined &&
		(typeof oldTitle === 'string' || typeof oldTitle === 'number') &&
		String(oldTitle) !== newTitle &&
		note.basename === taskBasename(String(oldTitle), id)
	) {
		const dir = note.path.slice(0, note.path.lastIndexOf('/') + 1);
		const newPath = `${dir}${taskBasename(newTitle ?? '', id)}.md`;
		if (newPath !== note.path && !host.exists(newPath)) {
			await host.renameFile(note.path, newPath);
			return { outcome: 'renamed', path: newPath };
		}
	}
	return { outcome: changed ? 'updated' : 'unchanged', path: note.path };
}
