// Scaffold rendering: fills `{=ctc:…=}` placeholders from a task.

import type { ManagedProperties } from './properties';

export const DEFAULT_SCAFFOLD = '[Open in ClickUp]({=ctc:url=})\n\n{=ctc:description=}\n\n## Notes\n';

export type PlaceholderValues = Record<string, string>;

export function placeholderValues(props: ManagedProperties, description: string): PlaceholderValues {
	return {
		url: props['clickup-url'] ?? '',
		description,
	};
}

export function renderText(text: string, values: PlaceholderValues): string {
	return text.replace(/\{=ctc:([^=}]*)=\}/g, (token, name: string) => values[name] ?? token);
}
