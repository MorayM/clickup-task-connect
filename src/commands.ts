import { ImportTaskModal } from './ui/import-modal';
import type ClickUpTaskConnectPlugin from './main';

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
	plugin.addRibbonIcon('refresh-cw', 'Refresh ClickUp tasks', () => void plugin.runner.run('manual'));
}
