// The refresh operation: pull assigned tasks and write task notes.

import { ClickUpClient } from './clickup';
import { connect } from './connection';
import type { HostPort } from './host';
import { normalizeFolder } from './folder';
import { buildIndex } from './note-index';
import { applyProperties, deriveState, managedProperties, type ManagedProperties } from './properties';
import { taskBasename } from './filename';
import { DEFAULT_SCAFFOLD, placeholderValues, renderText } from './scaffold';
import type { EngineSettings, Result } from './types';

export type RefreshMode = 'manual' | 'interval';

export interface WriteFailure {
	path: string;
	message: string;
}

export interface RefreshSummary {
	created: number;
	updated: number;
	failures: WriteFailure[];
}

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
	const summary: RefreshSummary = { created: 0, updated: 0, failures: [] };
	const zone = host.timeZone();

	for (const task of listing.value) {
		const props = managedProperties(task, deriveState(task, user.id), zone);
		const notes = index.get(props['clickup-id']!) ?? [];
		const existing = notes[0];
		const path = existing?.path ?? `${folder}/${taskBasename(task.name ?? '', task.id)}.md`;
		try {
			if (existing) {
				if (await writeProperties(host, existing.path, props)) summary.updated++;
			} else {
				if (!host.exists(folder)) await host.createFolder(folder);
				const body = renderText(DEFAULT_SCAFFOLD, placeholderValues(props, task.markdown_description ?? ''));
				await host.createFile(path, body);
				await writeProperties(host, path, props);
				summary.created++;
			}
		} catch (e) {
			summary.failures.push({ path, message: e instanceof Error ? e.message : String(e) });
		}
	}
	return { ok: true, summary };
}

/** Writes managed properties to a note. Returns whether anything changed. */
async function writeProperties(host: HostPort, path: string, props: ManagedProperties): Promise<boolean> {
	let changed = false;
	await host.processFrontMatter(path, (fm) => {
		changed = applyProperties(fm, props);
	});
	return changed;
}
