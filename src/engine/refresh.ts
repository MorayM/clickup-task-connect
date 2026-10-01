// The refresh operation: pull assigned tasks and write task notes.

import { ClickUpClient } from './clickup';
import { connect } from './connection';
import type { HostPort } from './host';
import { normalizeFolder } from './folder';
import { buildIndex } from './note-index';
import { deriveState, managedProperties } from './properties';
import { createTaskNote, newNotePath, updateTaskNote } from './task-notes';
import { loadScaffold } from './scaffold';
import type { EngineError, EngineSettings, Result } from './types';

export type RefreshMode = 'manual' | 'interval';

export interface WriteFailure {
	path: string;
	message: string;
}

export interface RefreshSummary {
	created: number;
	updated: number;
	renamed: number;
	closed: number;
	notAssigned: number;
	gone: number;
	/** Task IDs claimed by more than one note. Those tasks are left alone. */
	duplicates: number;
	failures: WriteFailure[];
	/** Why new notes were skipped because of the scaffold note, if they were. */
	scaffoldError?: EngineError;
	/** Why classifying dropped tasks stopped early, if it did. */
	interrupted?: EngineError;
}

/** States whose notes are never fetched one by one. */
const SETTLED_STATES: unknown[] = ['closed', 'not-assigned', 'gone'];

export async function refresh(
	host: HostPort,
	settings: EngineSettings,
	_mode: RefreshMode,
): Promise<Result<{ summary: RefreshSummary }>> {
	const folder = normalizeFolder(settings.taskNoteFolder);
	if (folder === null) return { ok: false, error: { kind: 'invalid-folder' } };
	if (!settings.token) return { ok: false, error: { kind: 'no-token' } };
	if (!host.isIndexReady(folder)) return { ok: false, error: { kind: 'indexing' } };
	const client = new ClickUpClient(host, settings.token);
	const connection = await connect(client, settings.workspaceId);
	if (!connection.ok) return { ok: false, error: connection.error };
	const { user } = connection;
	const listing = await client.listAssignedTasks(connection.workspace.id, user.id);
	if (!listing.ok) return listing;

	const index = buildIndex(host, folder);
	const summary: RefreshSummary = {
		created: 0,
		updated: 0,
		renamed: 0,
		closed: 0,
		notAssigned: 0,
		gone: 0,
		duplicates: 0,
		failures: [],
	};
	const zone = host.timeZone();
	let scaffold: Awaited<ReturnType<typeof loadScaffold>> | undefined;
	for (const notes of index.values()) if (notes.length > 1) summary.duplicates++;

	for (const task of listing.value) {
		const props = managedProperties(task, deriveState(task, user.id), zone);
		const notes = index.get(props['clickup-id']) ?? [];
		if (notes.length > 1) continue;
		const existing = notes[0];
		const path = existing?.path ?? newNotePath(folder, props);
		try {
			if (existing) {
				const { outcome } = await updateTaskNote(host, existing, props);
				if (outcome !== 'unchanged') summary[outcome]++;
			} else {
				// Loaded on the first create only. A missing scaffold blocks every create in this run.
				if (scaffold === undefined) scaffold = await loadScaffold(host, settings.scaffoldPath);
				if (!scaffold.ok) {
					summary.scaffoldError = scaffold.error;
					continue;
				}
				await createTaskNote(host, folder, task, props, scaffold.scaffold);
				summary.created++;
			}
		} catch (e) {
			summary.failures.push({ path, message: errorText(e) });
		}
	}

	// Dropped tasks: notes still marked assigned whose task wasn't listed. Classify one at a time.
	const listed = new Set(listing.value.map((task) => String(task.id)));
	const dropped = [...index.entries()]
		.filter(([id, notes]) => notes.length === 1 && !listed.has(id))
		.map(([id, notes]) => ({ id, note: notes[0]! }))
		.filter(({ note }) => !SETTLED_STATES.includes(note.frontmatter?.['clickup-state']))
		.sort((a, b) => a.note.path.localeCompare(b.note.path));
	for (const { id, note } of dropped) {
		const fetched = await client.getTask(id);
		if (!fetched.ok && fetched.error.kind !== 'not-found') {
			summary.interrupted = fetched.error;
			break;
		}
		try {
			if (!fetched.ok) {
				await updateTaskNote(host, note, { 'clickup-state': 'gone' });
				summary.gone++;
				continue;
			}
			const state = deriveState(fetched.value, user.id);
			const { outcome } = await updateTaskNote(host, note, managedProperties(fetched.value, state, zone));
			if (state === 'closed') summary.closed++;
			else if (state === 'not-assigned') summary.notAssigned++;
			else if (outcome !== 'unchanged') summary[outcome]++;
		} catch (e) {
			summary.failures.push({ path: note.path, message: errorText(e) });
		}
	}
	return { ok: true, summary };
}

function errorText(e: unknown): string {
	return e instanceof Error ? e.message : String(e);
}
