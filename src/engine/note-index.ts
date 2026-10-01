// The per-run task note index: task ID → notes in the task note folder.

import type { HostPort, NoteInfo } from './host';

export type NoteIndex = Map<string, NoteInfo[]>;

export function buildIndex(host: HostPort, folder: string): NoteIndex {
	const index: NoteIndex = new Map();
	for (const note of host.listNotes(folder)) {
		const id = taskId(note.frontmatter?.['clickup-id']);
		if (id === null) continue;
		const notes = index.get(id);
		if (notes) notes.push(note);
		else index.set(id, [note]);
	}
	return index;
}

function taskId(value: unknown): string | null {
	if (typeof value !== 'string' && typeof value !== 'number') return null;
	const id = String(value).trim();
	return id === '' ? null : id;
}
