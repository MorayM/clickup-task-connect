// Obsidian adapter for the engine's host port.

import { App, TFile, TFolder, parseYaml, requestUrl } from 'obsidian';
import type { Frontmatter, HostPort, HttpRequest, HttpResponse, NoteInfo } from './engine/host';

export class ObsidianHost implements HostPort {
	constructor(
		private readonly app: App,
		/** True once the metadata cache has fired its first `resolved` event. */
		private readonly cacheResolved: () => boolean,
	) {}

	async request(req: HttpRequest): Promise<HttpResponse> {
		const res = await requestUrl({ url: req.url, headers: req.headers, throw: false });
		let json: unknown = null;
		try {
			json = res.json;
		} catch {
			// Not a JSON body.
		}
		return { status: res.status, headers: res.headers, json };
	}

	listNotes(folder: string): NoteInfo[] {
		return this.markdownFiles(folder).map((file) => ({
			path: file.path,
			basename: file.basename,
			frontmatter: this.app.metadataCache.getFileCache(file)?.frontmatter ?? null,
		}));
	}

	isIndexReady(folder: string): boolean {
		if (this.cacheResolved()) return true;
		// The plugin may have been enabled after the initial index finished, in which case
		// `resolved` only fires on the next change. Only this folder's notes matter.
		return this.markdownFiles(folder).every((file) => this.app.metadataCache.getFileCache(file) !== null);
	}

	exists(path: string): boolean {
		return this.app.vault.getAbstractFileByPath(path) !== null;
	}

	async createFolder(path: string): Promise<void> {
		let current = '';
		for (const part of path.split('/')) {
			current = current ? `${current}/${part}` : part;
			if (!this.exists(current)) await this.app.vault.createFolder(current);
		}
	}

	async createFile(path: string, content: string): Promise<void> {
		await this.app.vault.create(path, content);
	}

	async processFrontMatter(path: string, fn: (frontmatter: Frontmatter) => void): Promise<void> {
		await this.app.fileManager.processFrontMatter(this.file(path), fn);
	}

	async renameFile(path: string, newPath: string): Promise<void> {
		await this.app.fileManager.renameFile(this.file(path), newPath);
	}

	async readText(path: string): Promise<string> {
		return this.app.vault.read(this.file(path));
	}

	parseYaml(text: string): unknown {
		return parseYaml(text);
	}

	now(): Date {
		return new Date();
	}

	timeZone(): string {
		return Intl.DateTimeFormat().resolvedOptions().timeZone;
	}

	private file(path: string): TFile {
		const file = this.app.vault.getFileByPath(path);
		if (!file) throw new Error(`File not found: ${path}`);
		return file;
	}

	private markdownFiles(folder: string): TFile[] {
		const root = this.app.vault.getFolderByPath(folder);
		const files: TFile[] = [];
		const walk = (dir: TFolder) => {
			for (const child of dir.children) {
				if (child instanceof TFolder) walk(child);
				else if (child instanceof TFile && child.extension === 'md') files.push(child);
			}
		};
		if (root) walk(root);
		return files;
	}
}
