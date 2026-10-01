// Task note filenames.

/** The basename (no `.md`) for a task note. */
export function taskBasename(name: string, id: string): string {
	return `${name} (${id})`;
}
