// The single port the task-note engine depends on. The Obsidian adapter
// implements it for real; tests use an in-memory fake.

export interface HttpRequest {
	url: string;
	headers: Record<string, string>;
}

export interface HttpResponse {
	status: number;
	headers: Record<string, string>;
	/** Parsed JSON body, or null when the body isn't JSON. */
	json: unknown;
}

export type Frontmatter = Record<string, unknown>;

export interface NoteInfo {
	path: string;
	/** File name without folder or `.md`. */
	basename: string;
	frontmatter: Frontmatter | null;
}

export interface HostPort {
	/** Never throws on an HTTP status. Throws when the request can't be made. */
	request(req: HttpRequest): Promise<HttpResponse>;

	/** Markdown files in `folder` and its subfolders, with parsed frontmatter. */
	listNotes(folder: string): NoteInfo[];
	/** Whether the metadata index can be trusted for `folder`. */
	isIndexReady(folder: string): boolean;
	exists(path: string): boolean;
	createFolder(path: string): Promise<void>;
	createFile(path: string, content: string): Promise<void>;
	processFrontMatter(path: string, fn: (frontmatter: Frontmatter) => void): Promise<void>;
	/** Renames a file and updates links to it. */
	renameFile(path: string, newPath: string): Promise<void>;
	/** Throws when the file is missing or unreadable. */
	readText(path: string): Promise<string>;
	parseYaml(text: string): unknown;

	now(): Date;
	/** IANA time zone used for local dates, e.g. `Europe/London`. */
	timeZone(): string;
}
