// The data behind the Insert link to task picker. Reads only the vault.

import { normalizeFolder } from './folder';
import type { Frontmatter, HostPort } from './host';
import { buildIndex } from './note-index';
import type { EngineSettings, Result } from './types';

export interface AssignedTaskNote {
	path: string;
	id: string;
	title: string;
	status: string | null;
	/** `YYYY-MM-DD`, or null when undated. */
	due: string | null;
	list: string | null;
}

/** Assigned task notes, soonest due first and undated last. Duplicates are left out. */
export async function listAssignedTaskNotes(
	host: HostPort,
	settings: EngineSettings,
): Promise<Result<{ notes: AssignedTaskNote[] }>> {
	const folder = normalizeFolder(settings.taskNoteFolder);
	if (folder === null) return { ok: false, error: { kind: 'invalid-folder' } };
	if (!host.isIndexReady(folder)) return { ok: false, error: { kind: 'indexing' } };

	const notes: AssignedTaskNote[] = [];
	for (const [id, claimed] of buildIndex(host, folder)) {
		const note = claimed[0];
		if (claimed.length !== 1 || !note || note.frontmatter?.['clickup-state'] !== 'assigned') continue;
		const fm = note.frontmatter;
		notes.push({
			path: note.path,
			id,
			title: text(fm, 'clickup-title') ?? note.basename,
			status: text(fm, 'clickup-status'),
			due: text(fm, 'clickup-due'),
			list: text(fm, 'clickup-list'),
		});
	}
	return { ok: true, notes: notes.sort(byDue) };
}

function byDue(a: AssignedTaskNote, b: AssignedTaskNote): number {
	if (a.due !== b.due) {
		if (a.due === null) return 1;
		if (b.due === null) return -1;
		return a.due < b.due ? -1 : 1;
	}
	return a.title.localeCompare(b.title);
}

function text(fm: Frontmatter, key: string): string | null {
	const value = fm[key];
	if (typeof value !== 'string' && typeof value !== 'number') return null;
	const s = String(value).trim();
	return s === '' ? null : s;
}
