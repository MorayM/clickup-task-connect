// The refresh operation: pull assigned tasks and write task notes.

import { ClickUpClient } from './clickup';
import { connect } from './connection';
import type { HostPort } from './host';
import { normalizeFolder } from './folder';
import { buildIndex } from './note-index';
import { applyProperties, deriveState, managedProperties } from './properties';
import { taskBasename } from './filename';
import { DEFAULT_SCAFFOLD, placeholderValues, renderText } from './scaffold';
import type { EngineSettings, Result } from './types';

export type RefreshMode = 'manual' | 'interval';

export interface RefreshSummary {
	created: number;
	updated: number;
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
	if (!connection.ok) return connection;
	const { user } = connection;
	const listing = await client.listAssignedTasks(connection.workspace.id, user.id);
	if (!listing.ok) return listing;

	const index = buildIndex(host, folder);
	const summary: RefreshSummary = { created: 0, updated: 0 };
	const zone = host.timeZone();

	for (const task of listing.value) {
		const props = managedProperties(task, deriveState(task, user.id), zone);
		const notes = index.get(props['clickup-id']!) ?? [];
		const existing = notes[0];
		if (existing) {
			let changed = false;
			await host.processFrontMatter(existing.path, (fm) => {
				changed = applyProperties(fm, props);
			});
			if (changed) summary.updated++;
			continue;
		}
		if (!host.exists(folder)) await host.createFolder(folder);
		const path = `${folder}/${taskBasename(task.name ?? '', task.id)}.md`;
		const body = renderText(DEFAULT_SCAFFOLD, placeholderValues(props, task.markdown_description ?? ''));
		await host.createFile(path, body);
		await host.processFrontMatter(path, (fm) => applyProperties(fm, props));
		summary.created++;
	}
	return { ok: true, summary };
}
