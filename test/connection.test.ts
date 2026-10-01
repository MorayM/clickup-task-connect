import { describe, expect, it } from 'vitest';
import { testConnection } from '../src/engine/engine';
import { FakeHost, json } from './fake-host';
import { BASE, settings, TEAM, withClickUp } from './clickup-fixtures';

const twoWorkspaces = json(200, {
	teams: [
		{ id: TEAM, name: 'Acme' },
		{ id: '777', name: 'Side project' },
	],
});

describe('testConnection', () => {
	it('reports the user and their only workspace', async () => {
		const host = withClickUp(new FakeHost(), []);

		const result = await testConnection(host, settings());

		expect(result).toEqual({ ok: true, username: 'Moray', workspace: { id: TEAM, name: 'Acme' } });
		expect(host.requests).toEqual([`${BASE}/user`, `${BASE}/team`]);
	});

	it('reports the workspace named by Workspace ID', async () => {
		const host = withClickUp(new FakeHost(), []).on(`${BASE}/team`, twoWorkspaces);

		const result = await testConnection(host, settings({ workspaceId: '777' }));

		expect(result).toEqual({ ok: true, username: 'Moray', workspace: { id: '777', name: 'Side project' } });
	});

	it('lists every workspace when there are several and the ID is blank', async () => {
		const host = withClickUp(new FakeHost(), []).on(`${BASE}/team`, twoWorkspaces);

		const result = await testConnection(host, settings());

		expect(result).toEqual({
			ok: true,
			username: 'Moray',
			workspaces: [
				{ id: TEAM, name: 'Acme' },
				{ id: '777', name: 'Side project' },
			],
		});
	});

	it('fails with no request when this device has no token', async () => {
		const host = withClickUp(new FakeHost(), []);

		const result = await testConnection(host, settings({ token: null }));

		expect(result).toEqual({ ok: false, error: { kind: 'no-token' } });
		expect(host.requests).toEqual([]);
	});

	it.each([
		['a rejected token', `${BASE}/user`, json(401, { ECODE: 'OAUTH_025' }), { kind: 'bad-token' }],
		['ClickUp being unreachable', `${BASE}/user`, 'network-error' as const, { kind: 'offline' }],
	])('fails on %s', async (_name, url, response, error) => {
		const host = withClickUp(new FakeHost(), []).on(url, response);

		expect(await testConnection(host, settings())).toEqual({ ok: false, error });
	});

	it('fails when the Workspace ID is not found', async () => {
		const host = withClickUp(new FakeHost(), []);

		const result = await testConnection(host, settings({ workspaceId: '123' }));

		expect(result).toEqual({ ok: false, error: { kind: 'workspace-not-found', id: '123' } });
	});
});
