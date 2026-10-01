import { Notice } from 'obsidian';
import { listAssignedTaskNotes } from './engine/engine';
import { errorNotice } from './feedback';
import type ClickUpTaskConnectPlugin from './main';
import { ImportTaskModal } from './ui/import-modal';
import { TaskLinkModal } from './ui/task-link-modal';

export function registerCommands(plugin: ClickUpTaskConnectPlugin): void {
	plugin.addCommand({
		id: 'refresh-tasks',
		name: 'Refresh tasks',
		callback: () => void plugin.runner.run('manual'),
	});
	plugin.addCommand({
		id: 'import-task',
		name: 'Import task by ID',
		callback: () => new ImportTaskModal(plugin).open(),
	});
	plugin.addCommand({
		id: 'insert-task-link',
		name: 'Insert link to task',
		editorCallback: async (editor, ctx) => {
			const result = await listAssignedTaskNotes(plugin.host, plugin.engineSettings());
			if (!result.ok) {
				new Notice(errorNotice(result.error));
				return;
			}
			if (result.notes.length === 0) {
				new Notice(
					createFragment((f) => {
						f.appendText('No assigned task notes. Run ');
						f.createEl('strong', { text: 'Refresh tasks' });
						f.appendText(' first.');
					}),
				);
				return;
			}
			new TaskLinkModal(plugin.app, result.notes, editor, ctx.file?.path ?? '').open();
		},
	});
	plugin.addRibbonIcon('refresh-cw', 'Refresh ClickUp tasks', () => void plugin.runner.run('manual'));
}
