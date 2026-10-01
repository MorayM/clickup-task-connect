import { App, Editor, prepareFuzzySearch, SuggestModal } from 'obsidian';
import type { AssignedTaskNote } from '../engine/engine';

/** Picks an assigned task note and inserts a link to it at the cursor. */
export class TaskLinkModal extends SuggestModal<AssignedTaskNote> {
	constructor(
		app: App,
		private readonly notes: AssignedTaskNote[],
		private readonly editor: Editor,
		private readonly sourcePath: string,
	) {
		super(app);
		this.setPlaceholder('Find a task by title, list or ID');
	}

	getSuggestions(query: string): AssignedTaskNote[] {
		if (query.trim() === '') return this.notes;
		const search = prepareFuzzySearch(query.trim());
		return this.notes
			.map((note) => ({ note, match: search(`${note.title} ${note.list ?? ''} ${note.id}`) }))
			.filter((entry) => entry.match !== null)
			.sort((a, b) => (b.match?.score ?? 0) - (a.match?.score ?? 0))
			.map((entry) => entry.note);
	}

	renderSuggestion(note: AssignedTaskNote, el: HTMLElement): void {
		el.createDiv({ text: note.title });
		const details = [note.status, note.due, note.list].filter((part) => part !== null).join(' · ');
		if (details) el.createEl('small', { text: details, cls: 'clickup-task-connect-details' });
	}

	onChooseSuggestion(note: AssignedTaskNote): void {
		const file = this.app.vault.getFileByPath(note.path);
		if (!file) return;
		this.editor.replaceSelection(this.app.fileManager.generateMarkdownLink(file, this.sourcePath));
	}
}
