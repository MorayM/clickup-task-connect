import { parse, stringify } from 'yaml';
import type { Frontmatter, HostPort, HttpRequest, HttpResponse, NoteInfo } from '../src/engine/host';

type Route = HttpResponse | 'network-error' | (() => HttpResponse | 'network-error');

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n?---(?:\r?\n|$)/;

export function splitNote(text: string): { frontmatter: Frontmatter | null; body: string } {
	const match = FRONTMATTER.exec(text);
	if (!match) return { frontmatter: null, body: text };
	const parsed: unknown = parse(match[1] ?? '');
	const frontmatter =
		parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Frontmatter) : {};
	return { frontmatter, body: text.slice(match[0].length) };
}

function joinNote(frontmatter: Frontmatter, body: string): string {
	if (Object.keys(frontmatter).length === 0) return body;
	return `---\n${stringify(frontmatter)}---\n${body}`;
}

export function json(status: number, body: unknown, headers: Record<string, string> = {}): HttpResponse {
	return { status, headers, json: body };
}

/** In-memory vault plus canned ClickUp responses keyed by exact URL. */
export class FakeHost implements HostPort {
	files = new Map<string, string>();
	folders = new Set<string>();
	requests: string[] = [];
	routes = new Map<string, Route>();
	indexReady = true;
	clock = new Date('2026-10-01T09:00:00Z');
	zone = 'Europe/London';
	failWrites = new Set<string>();
	unreadable = new Set<string>();

	/** Registers a canned response for an exact URL. */
	on(url: string, route: Route): this {
		this.routes.set(url, route);
		return this;
	}

	addNote(path: string, frontmatter: Frontmatter | null, body = ''): this {
		this.files.set(path, frontmatter ? joinNote(frontmatter, body) : body);
		return this;
	}

	note(path: string): { frontmatter: Frontmatter | null; body: string } {
		const text = this.files.get(path);
		if (text === undefined) throw new Error(`No file at ${path}`);
		return splitNote(text);
	}

	paths(): string[] {
		return [...this.files.keys()].sort();
	}

	// HostPort

	async request(req: HttpRequest): Promise<HttpResponse> {
		this.requests.push(req.url);
		const route = this.routes.get(req.url);
		const result = typeof route === 'function' ? route() : route;
		if (result === undefined) return json(404, { err: 'Route not found', ECODE: 'FAKE_404' });
		if (result === 'network-error') throw new Error('net::ERR_INTERNET_DISCONNECTED');
		return result;
	}

	listNotes(folder: string): NoteInfo[] {
		const prefix = `${folder}/`;
		return this.paths()
			.filter((path) => path.startsWith(prefix) && path.endsWith('.md'))
			.map((path) => ({
				path,
				basename: path.slice(path.lastIndexOf('/') + 1, -'.md'.length),
				frontmatter: splitNote(this.files.get(path) ?? '').frontmatter,
			}));
	}

	isIndexReady(): boolean {
		return this.indexReady;
	}

	exists(path: string): boolean {
		return this.files.has(path) || this.folders.has(path);
	}

	async createFolder(path: string): Promise<void> {
		if (this.exists(path)) throw new Error(`Folder already exists: ${path}`);
		this.folders.add(path);
	}

	async createFile(path: string, content: string): Promise<void> {
		if (this.exists(path)) throw new Error(`File already exists: ${path}`);
		const folder = path.slice(0, path.lastIndexOf('/'));
		if (folder && !this.folders.has(folder)) throw new Error(`No folder: ${folder}`);
		if (this.failWrites.has(path)) throw new Error('Disk full');
		this.files.set(path, content);
	}

	async processFrontMatter(path: string, fn: (frontmatter: Frontmatter) => void): Promise<void> {
		const text = this.files.get(path);
		if (text === undefined) throw new Error(`No file at ${path}`);
		if (this.failWrites.has(path)) throw new Error('Disk full');
		const { frontmatter, body } = splitNote(text);
		const next = frontmatter ?? {};
		fn(next);
		this.files.set(path, joinNote(next, body));
	}

	async renameFile(path: string, newPath: string): Promise<void> {
		const text = this.files.get(path);
		if (text === undefined) throw new Error(`No file at ${path}`);
		if (this.exists(newPath)) throw new Error(`Destination exists: ${newPath}`);
		this.files.delete(path);
		this.files.set(newPath, text);
	}

	async readText(path: string): Promise<string> {
		const text = this.files.get(path);
		if (text === undefined || this.unreadable.has(path)) throw new Error(`Can't read ${path}`);
		return text;
	}

	parseYaml(text: string): unknown {
		return parse(text);
	}

	now(): Date {
		return this.clock;
	}

	timeZone(): string {
		return this.zone;
	}
}
