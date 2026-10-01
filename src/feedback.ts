// Notice text for engine results. No `obsidian` imports, so the wording rules stay testable.

import type { EngineError } from './engine/types';
import type { RefreshSummary } from './engine/refresh';

export function errorMessage(error: EngineError): string {
	switch (error.kind) {
		case 'indexing':
			return 'Vault is still indexing, try again in a moment';
		case 'no-token':
			return 'Set your ClickUp API token in settings';
		case 'invalid-folder':
			return 'Choose a task note folder in settings';
		case 'bad-token':
			return 'Check your API token in settings';
		case 'offline':
			return "Couldn't reach ClickUp";
		case 'rate-limited':
			return `Rate limited, try again in ${error.waitSeconds} s`;
		case 'http':
			return `ClickUp returned an error (HTTP ${error.status})`;
		case 'several-workspaces':
			return 'Your token can see several workspaces. Set Workspace ID in settings.';
		case 'workspace-not-found':
			return `Workspace ${error.id} not found`;
		case 'invalid-input':
			return 'Enter a task ID or a ClickUp task URL';
		case 'not-found':
			return 'Task not found or not accessible';
		case 'duplicates':
			return `${error.paths.length} notes have this task ID: ${error.paths.join(', ')}`;
		case 'scaffold-missing':
			return `Scaffold note not found: ${error.path}`;
		case 'write-failed':
			return `Couldn't write ${error.path}: ${error.message}`;
	}
}

export function summaryMessage(summary: RefreshSummary): string {
	const parts: string[] = [];
	const add = (count: number, label: string) => {
		if (count > 0) parts.push(`${count} ${label}`);
	};
	add(summary.created, 'new');
	add(summary.updated, 'updated');
	return parts.length === 0 ? 'ClickUp: up to date' : `ClickUp: ${parts.join(', ')}`;
}
