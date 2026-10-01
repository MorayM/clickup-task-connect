// Resolves who the token belongs to and which workspace to use.

import type { ClickUpClient, ClickUpUser } from './clickup';
import type { EngineError, Workspace } from './types';

export type Connection =
	| { ok: true; user: ClickUpUser; workspace: Workspace }
	| { ok: false; error: EngineError; user?: ClickUpUser };

export async function connect(client: ClickUpClient, workspaceId: string): Promise<Connection> {
	const user = await client.getUser();
	if (!user.ok) return user;
	const workspaces = await client.getWorkspaces();
	if (!workspaces.ok) return { ok: false, error: workspaces.error, user: user.value };

	const all = workspaces.value;
	const id = workspaceId.trim();
	const workspace = id === '' ? (all.length === 1 ? all[0] : undefined) : all.find((w) => w.id === id);
	if (workspace) return { ok: true, user: user.value, workspace };
	const error: EngineError =
		id === '' ? { kind: 'several-workspaces', workspaces: all } : { kind: 'workspace-not-found', id };
	return { ok: false, error, user: user.value };
}
