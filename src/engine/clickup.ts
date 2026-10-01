// ClickUp API v2 client: requests, paging and error classification.

import type { HostPort, HttpResponse } from './host';
import type { ClickUpTask, EngineError, Workspace } from './types';

const BASE = 'https://api.clickup.com/api/v2';
const PAGE_SIZE = 100;
/** Guards against an API that never signals the last page. */
const MAX_PAGES = 500;

type Call<T> = { ok: true; value: T } | { ok: false; error: EngineError };

export interface ClickUpUser {
	id: number;
	username: string;
}

export class ClickUpClient {
	constructor(
		private readonly host: HostPort,
		private readonly token: string,
	) {}

	async getUser(): Promise<Call<ClickUpUser>> {
		const res = await this.get(`${BASE}/user`);
		if (!res.ok) return res;
		const user = field(res.value.json, 'user');
		return {
			ok: true,
			value: { id: Number(field(user, 'id')), username: text(field(user, 'username')) },
		};
	}

	async getWorkspaces(): Promise<Call<Workspace[]>> {
		const res = await this.get(`${BASE}/team`);
		if (!res.ok) return res;
		const teams = field(res.value.json, 'teams');
		const list = Array.isArray(teams) ? teams : [];
		return {
			ok: true,
			value: list.map((t) => ({ id: text(field(t, 'id')), name: text(field(t, 'name')) })),
		};
	}

	/** Every page of the user's open assigned tasks, or the first error. */
	async listAssignedTasks(workspaceId: string, userId: number): Promise<Call<ClickUpTask[]>> {
		const all: ClickUpTask[] = [];
		for (let page = 0; page < MAX_PAGES; page++) {
			const url =
				`${BASE}/team/${encodeURIComponent(workspaceId)}/task?assignees%5B%5D=${userId}` +
				`&subtasks=true&include_markdown_description=true&page=${page}`;
			const res = await this.get(url);
			if (!res.ok) return res;
			const tasks = tasksOf(res.value.json);
			all.push(...tasks);
			if (field(res.value.json, 'last_page') === true || tasks.length < PAGE_SIZE) break;
		}
		return { ok: true, value: all };
	}

	/**
	 * One task by ID. 429, network errors and a rejected token keep their own errors;
	 * any other failure means the task is gone or not accessible (`not-found`).
	 */
	async getTask(id: string): Promise<Call<ClickUpTask>> {
		const res = await this.send(`${BASE}/task/${encodeURIComponent(id)}?include_markdown_description=true`);
		if (res === null) return { ok: false, error: { kind: 'offline' } };
		if (res.status === 200) return { ok: true, value: res.json as ClickUpTask };
		if (res.status === 429 || (res.status === 401 && ecode(res) === 'OAUTH_025')) {
			return { ok: false, error: classify(res, this.host.now()) };
		}
		return { ok: false, error: { kind: 'not-found' } };
	}

	private async get(url: string): Promise<Call<HttpResponse>> {
		const res = await this.send(url);
		if (res === null) return { ok: false, error: { kind: 'offline' } };
		if (res.status === 200) return { ok: true, value: res };
		return { ok: false, error: classify(res, this.host.now()) };
	}

	/** The response, or null when ClickUp couldn't be reached. */
	private async send(url: string): Promise<HttpResponse | null> {
		try {
			return await this.host.request({ url, headers: { Authorization: this.token } });
		} catch {
			return null;
		}
	}
}

function classify(res: HttpResponse, now: Date): EngineError {
	if (res.status === 429) {
		const reset = Number(header(res, 'x-ratelimit-reset'));
		const waitSeconds = Number.isFinite(reset) ? Math.max(0, Math.ceil(reset - now.getTime() / 1000)) : 60;
		return { kind: 'rate-limited', waitSeconds };
	}
	if (res.status === 401 && ecode(res).startsWith('OAUTH_')) return { kind: 'bad-token' };
	return { kind: 'http', status: res.status };
}

function ecode(res: HttpResponse): string {
	const code = field(res.json, 'ECODE');
	return typeof code === 'string' ? code : '';
}

function header(res: HttpResponse, name: string): string | undefined {
	const key = Object.keys(res.headers).find((k) => k.toLowerCase() === name);
	return key === undefined ? undefined : res.headers[key];
}

function tasksOf(body: unknown): ClickUpTask[] {
	const tasks = field(body, 'tasks');
	return Array.isArray(tasks) ? (tasks as ClickUpTask[]) : [];
}

function text(value: unknown): string {
	return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

function field(value: unknown, key: string): unknown {
	return value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined;
}
