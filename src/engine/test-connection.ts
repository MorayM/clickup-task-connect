// The test-connection operation behind the settings action.

import { ClickUpClient } from './clickup';
import { connect } from './connection';
import type { HostPort } from './host';
import type { EngineSettings, Result, Workspace } from './types';

export type ConnectionReport = { username: string } & ({ workspace: Workspace } | { workspaces: Workspace[] });

export async function testConnection(host: HostPort, settings: EngineSettings): Promise<Result<ConnectionReport>> {
	if (!settings.token) return { ok: false, error: { kind: 'no-token' } };
	const connection = await connect(new ClickUpClient(host, settings.token), settings.workspaceId);
	if (connection.ok) return { ok: true, username: connection.user.username, workspace: connection.workspace };
	if (connection.error.kind === 'several-workspaces' && connection.user) {
		return { ok: true, username: connection.user.username, workspaces: connection.error.workspaces };
	}
	return { ok: false, error: connection.error };
}
