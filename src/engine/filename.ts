// Task note filenames.

const MAX_NAME_LENGTH = 100;
// eslint-disable-next-line no-control-regex -- control characters are exactly what's being removed
const ILLEGAL = /[<>:"/\\|?*#^[\]\u0000-\u001f\u007f]/g;
const EDGES = /^[\s.]+|[\s.]+$/g;

/** The basename (no `.md`) for a task note: `<cleaned name> (<id>)`, or `(<id>)` when nothing is left. */
export function taskBasename(name: string, id: string): string {
	// Whitespace first, so tabs and newlines become spaces rather than vanishing as control characters.
	const cleaned = name
		.replace(/\s+/g, ' ')
		.replace(ILLEGAL, '')
		.replace(/ {2,}/g, ' ')
		.replace(EDGES, '')
		.slice(0, MAX_NAME_LENGTH)
		.replace(EDGES, '');
	return cleaned === '' ? `(${id})` : `${cleaned} (${id})`;
}
