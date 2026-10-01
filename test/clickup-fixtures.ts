import { FakeHost, json } from './fake-host';
import type { EngineSettings } from '../src/engine/engine';

export const BASE = 'https://api.clickup.com/api/v2';
export const ME = 1001;
export const TEAM = '9001';

export const settings = (overrides: Partial<EngineSettings> = {}): EngineSettings => ({
	token: 'pk_test',
	workspaceId: '',
	taskNoteFolder: 'ClickUp',
	scaffoldPath: '',
	...overrides,
});

export const listingUrl = (page: number, team = TEAM, user = ME) =>
	`${BASE}/team/${team}/task?assignees%5B%5D=${user}&subtasks=true&include_markdown_description=true&page=${page}`;

export const taskUrl = (id: string) => `${BASE}/task/${id}?include_markdown_description=true`;

// 2026-10-03 04:00 in London (BST) as Unix ms, the way ClickUp stores date-only due dates.
export const DUE_OCT_3 = String(Date.UTC(2026, 9, 3, 3, 0, 0));

export interface TaskFixture {
	id: string;
	name: string;
	[key: string]: unknown;
}

export function task(fields: TaskFixture): Record<string, unknown> {
	return {
		url: `https://app.clickup.com/t/${fields.id}`,
		status: { status: 'to do', type: 'open' },
		due_date: null,
		start_date: null,
		date_created: String(Date.UTC(2026, 8, 1, 12)),
		priority: null,
		list: { id: 'L1', name: 'Backlog' },
		folder: { id: 'F1', name: 'Projects', hidden: false },
		space: { id: 'S1' },
		parent: null,
		assignees: [{ id: ME, username: 'Moray' }],
		creator: { id: ME, username: 'Moray' },
		tags: [],
		markdown_description: '',
		...fields,
	};
}

/** Serves the user, one workspace and a single listing page. */
export function withClickUp(host: FakeHost, tasks: unknown[]): FakeHost {
	return host
		.on(`${BASE}/user`, json(200, { user: { id: ME, username: 'Moray' } }))
		.on(`${BASE}/team`, json(200, { teams: [{ id: TEAM, name: 'Acme' }] }))
		.on(listingUrl(0), json(200, { tasks, last_page: true }));
}
