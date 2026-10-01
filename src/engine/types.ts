// Shapes shared across the engine and its callers.

/** The parts of a ClickUp task the engine reads. Everything is optional because the API is untyped. */
export interface ClickUpTask {
	id: string;
	name?: string;
	url?: string;
	status?: { status?: string; type?: string } | null;
	due_date?: string | null;
	start_date?: string | null;
	date_created?: string | null;
	priority?: { priority?: string } | number | string | null;
	list?: { name?: string } | null;
	folder?: { name?: string; hidden?: boolean } | null;
	space?: { name?: string } | null;
	parent?: string | null;
	assignees?: { id?: number; username?: string }[];
	creator?: { username?: string } | null;
	tags?: { name?: string }[];
	markdown_description?: string | null;
}

export type TaskState = 'assigned' | 'closed' | 'not-assigned' | 'gone';

export interface Workspace {
	id: string;
	name: string;
}

export type EngineError =
	| { kind: 'indexing' }
	| { kind: 'no-token' }
	| { kind: 'invalid-folder' }
	| { kind: 'bad-token' }
	| { kind: 'offline' }
	| { kind: 'rate-limited'; waitSeconds: number }
	| { kind: 'http'; status: number }
	| { kind: 'several-workspaces'; workspaces: Workspace[] }
	| { kind: 'workspace-not-found'; id: string }
	| { kind: 'invalid-input' }
	| { kind: 'not-found' }
	| { kind: 'duplicates'; paths: string[] }
	| { kind: 'scaffold-missing'; path: string }
	| { kind: 'scaffold-invalid'; path: string }
	| { kind: 'write-failed'; path: string; message: string };

export type Result<T> = ({ ok: true } & T) | { ok: false; error: EngineError };

/** What the engine needs from settings, captured once at the start of a run. */
export interface EngineSettings {
	/** The token from this device's secret storage, or null when there isn't one. */
	token: string | null;
	workspaceId: string;
	taskNoteFolder: string;
	scaffoldPath: string;
}
