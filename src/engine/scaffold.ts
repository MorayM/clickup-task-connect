// Scaffold loading and rendering: fills `{=ctc:…=}` placeholders from a task.

import type { Frontmatter, HostPort } from './host';
import { formatDate, localDate, MANAGED_KEYS, type ManagedProperties } from './properties';
import type { ClickUpTask } from './types';

export const DEFAULT_SCAFFOLD = '[Open in ClickUp]({=ctc:url=})\n\n{=ctc:description=}\n\n## Notes\n';

const TOKEN = /\{=ctc:([^=}]*)=\}/g;
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n?---[ \t]*(?:\r?\n|$)/;

export interface Scaffold {
	frontmatter: Frontmatter;
	body: string;
}

export type PlaceholderValues = Record<string, string>;

/**
 * Reads the scaffold note, or the default scaffold when no path is set.
 * Returns null when the note is missing, unreadable or has invalid frontmatter.
 */
export async function loadScaffold(host: HostPort, path: string): Promise<Scaffold | null> {
	if (path.trim() === '') return { frontmatter: {}, body: DEFAULT_SCAFFOLD };
	let text: string;
	try {
		text = await host.readText(path);
	} catch {
		return null;
	}
	const match = FRONTMATTER.exec(text);
	if (!match) return { frontmatter: {}, body: text };
	let parsed: unknown;
	try {
		parsed = host.parseYaml(match[1] ?? '');
	} catch {
		return null;
	}
	if (parsed !== null && parsed !== undefined && (typeof parsed !== 'object' || Array.isArray(parsed))) return null;
	return { frontmatter: (parsed ?? {}) as Frontmatter, body: text.slice(match[0].length) };
}

/** The scaffold with placeholders filled. Frontmatter is filled value by value, so YAML stays valid. */
export function renderScaffold(scaffold: Scaffold, values: PlaceholderValues): Scaffold {
	return {
		frontmatter: fillStrings(scaffold.frontmatter, values) as Frontmatter,
		body: renderText(scaffold.body, values),
	};
}

export function placeholderValues(
	task: ClickUpTask,
	props: ManagedProperties,
	now: Date,
	timeZone: string,
): PlaceholderValues {
	const values: PlaceholderValues = {};
	for (const key of MANAGED_KEYS) values[key.slice('clickup-'.length)] = props[key] ?? '';
	const names = (items: { name?: string; username?: string }[] | undefined, key: 'name' | 'username') =>
		(items ?? []).map((item) => item[key] ?? '').filter((name) => name !== '').join(', ');
	return {
		...values,
		description: task.markdown_description ?? '',
		space: task.space?.name ?? '',
		folder: task.folder && !task.folder.hidden ? (task.folder.name ?? '') : '',
		tags: names(task.tags, 'name'),
		assignees: names(task.assignees, 'username'),
		creator: task.creator?.username ?? '',
		created: localDate(task.date_created, timeZone) ?? '',
		start: localDate(task.start_date, timeZone) ?? '',
		today: formatDate(now, timeZone),
		raw: '```json\n' + JSON.stringify(task, null, 2) + '\n```',
	};
}

function renderText(text: string, values: PlaceholderValues): string {
	return text.replace(TOKEN, (token, name: string) => values[name] ?? token);
}

function fillStrings(value: unknown, values: PlaceholderValues): unknown {
	if (typeof value === 'string') return renderText(value, values);
	if (Array.isArray(value)) return value.map((item) => fillStrings(item, values));
	if (value && typeof value === 'object') {
		return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, fillStrings(item, values)]));
	}
	return value;
}
