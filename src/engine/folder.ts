/** Normalises a task note folder setting. Returns null for empty values and the vault root. */
export function normalizeFolder(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const folder = value.trim().replace(/^\/+|\/+$/g, '');
	return folder === '' ? null : folder;
}
