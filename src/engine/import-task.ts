// The import operation: create or update the task note for one task by ID or URL.

import { ClickUpClient } from './clickup';
import { normalizeFolder } from './folder';
import type { HostPort } from './host';
import { buildIndex } from './note-index';
import { deriveState, managedProperties } from './properties';
import { loadScaffold } from './scaffold';
import { createTaskNote, newNotePath, PathTakenError, updateTaskNote } from './task-notes';
import type { EngineSettings, Result } from './types';

// ClickUp task IDs are short lowercase alphanumerics with at least one digit, e.g. `86c0abcde`.
const TASK_ID = /^(?=.*\d)[0-9a-z]{5,15}$/i;

export async function importTask(
	host: HostPort,
	settings: EngineSettings,
	rawInput: string,
): Promise<Result<{ path: string }>> {
	const id = parseTaskId(rawInput);
	if (id === null) return { ok: false, error: { kind: 'invalid-input' } };
	const folder = normalizeFolder(settings.taskNoteFolder);
	if (folder === null) return { ok: false, error: { kind: 'invalid-folder' } };
	if (!settings.token) return { ok: false, error: { kind: 'no-token' } };
	if (!host.isIndexReady(folder)) return { ok: false, error: { kind: 'indexing' } };

	const notes = buildIndex(host, folder).get(id) ?? [];
	if (notes.length > 1) return { ok: false, error: { kind: 'duplicates', paths: notes.map((n) => n.path).sort() } };

	const client = new ClickUpClient(host, settings.token);
	const user = await client.getUser();
	if (!user.ok) return user;
	const fetched = await client.getTask(id);
	if (!fetched.ok) return fetched;
	const task = fetched.value;
	const props = managedProperties(task, deriveState(task, user.value.id), host.timeZone());

	const existing = notes[0];
	const path = existing?.path ?? newNotePath(folder, props);
	try {
		if (existing) return { ok: true, path: (await updateTaskNote(host, existing, props)).path };
		const scaffold = await loadScaffold(host, settings.scaffoldPath);
		if (!scaffold.ok) return scaffold;
		return { ok: true, path: await createTaskNote(host, folder, task, props, scaffold.scaffold) };
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return { ok: false, error: { kind: 'write-failed', path: e instanceof PathTakenError ? e.path : path, message } };
	}
}

/** A task ID from a bare ID or a `…/t/<id>` or `…/t/<workspace>/<id>` URL, or null. */
function parseTaskId(rawInput: string): string | null {
	const input = rawInput.trim();
	if (!input.includes('/')) return TASK_ID.test(input) ? input : null;
	let url: URL;
	try {
		url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(input) ? input : `https://${input}`);
	} catch {
		return null;
	}
	const segments = url.pathname.split('/').filter((s) => s !== '');
	const last = segments[segments.length - 1];
	if (segments[0] !== 't' || segments.length < 2 || segments.length > 3 || last === undefined) return null;
	return TASK_ID.test(last) ? last : null;
}
