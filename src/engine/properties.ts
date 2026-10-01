// Task → managed property mapping.

import type { Frontmatter } from './host';
import type { ClickUpTask, TaskState } from './types';

export const MANAGED_KEYS = [
	'clickup-id',
	'clickup-url',
	'clickup-title',
	'clickup-status',
	'clickup-due',
	'clickup-priority',
	'clickup-list',
	'clickup-parent',
	'clickup-state',
] as const;

export type ManagedProperties = Record<(typeof MANAGED_KEYS)[number], string | null> & {
	'clickup-id': string;
	'clickup-state': TaskState;
};

const PRIORITY_LABELS = ['urgent', 'high', 'normal', 'low'];

export function deriveState(task: ClickUpTask, userId: number): TaskState {
	if (task.status?.type === 'closed') return 'closed';
	return task.assignees?.some((a) => a.id === userId) ? 'assigned' : 'not-assigned';
}

export function managedProperties(task: ClickUpTask, state: TaskState, timeZone: string): ManagedProperties {
	return {
		'clickup-id': String(task.id),
		'clickup-url': task.url || null,
		'clickup-title': task.name ?? null,
		'clickup-status': task.status?.status || null,
		'clickup-due': localDate(task.due_date, timeZone),
		'clickup-priority': priorityLabel(task.priority),
		'clickup-list': task.list?.name || null,
		'clickup-parent': task.parent ? String(task.parent) : null,
		'clickup-state': state,
	};
}

/**
 * Writes the properties into `frontmatter` in place, keeping other keys and their order.
 * Returns whether anything changed.
 */
export function applyProperties(frontmatter: Frontmatter, props: Partial<ManagedProperties>): boolean {
	let changed = false;
	for (const [key, value] of Object.entries(props)) {
		if (!(key in frontmatter) || frontmatter[key] !== value) changed = true;
		frontmatter[key] = value;
	}
	return changed;
}

/** Formats a ClickUp Unix-ms string as a local `YYYY-MM-DD`, or null. */
export function localDate(ms: string | null | undefined, timeZone: string): string | null {
	if (ms === null || ms === undefined || ms === '') return null;
	const date = new Date(Number(ms));
	if (Number.isNaN(date.getTime())) return null;
	return formatDate(date, timeZone);
}

export function formatDate(date: Date, timeZone: string): string {
	// en-CA formats as YYYY-MM-DD.
	return new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).format(date);
}

function priorityLabel(priority: ClickUpTask['priority']): string | null {
	if (priority === null || priority === undefined) return null;
	if (typeof priority === 'object') {
		const label = priority.priority?.toLowerCase();
		return label && PRIORITY_LABELS.includes(label) ? label : null;
	}
	const index = Number(priority);
	return Number.isInteger(index) ? (PRIORITY_LABELS[index - 1] ?? null) : null;
}
