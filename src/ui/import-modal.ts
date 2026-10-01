import { Modal, Setting } from 'obsidian';
import { importTask } from '../engine/engine';
import { errorMessage } from '../feedback';
import type ClickUpTaskConnectPlugin from '../main';

/** Prompts for a task ID or URL, imports it and opens the note. Errors stay inline so the user can retry. */
export class ImportTaskModal extends Modal {
	private input = '';
	private busy = false;

	constructor(private readonly plugin: ClickUpTaskConnectPlugin) {
		super(plugin.app);
	}

	onOpen(): void {
		this.setTitle('Import task by ID');
		const inputSetting = new Setting(this.contentEl).setName('Task ID or URL');
		const errorEl = this.contentEl.createDiv({ cls: 'clickup-task-connect-error' });
		errorEl.hide();

		const submit = async () => {
			if (this.busy) return;
			this.busy = true;
			errorEl.hide();
			try {
				const result = await importTask(this.plugin.host, this.plugin.engineSettings(), this.input);
				if (!result.ok) {
					errorEl.setText(errorMessage(result.error));
					errorEl.show();
					return;
				}
				this.close();
				const file = this.app.vault.getFileByPath(result.path);
				if (file) await this.app.workspace.getLeaf(false).openFile(file);
			} finally {
				this.busy = false;
			}
		};

		inputSetting.addText((text) => {
			text.setPlaceholder('Paste a task ID or link').onChange((value) => {
				this.input = value;
			});
			text.inputEl.addEventListener('keydown', (event) => {
				if (event.key === 'Enter') {
					event.preventDefault();
					void submit();
				}
			});
			window.setTimeout(() => text.inputEl.focus(), 0);
		});

		new Setting(this.contentEl).addButton((button) =>
			button
				.setButtonText('Import')
				.setCta()
				.onClick(() => void submit()),
		);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
