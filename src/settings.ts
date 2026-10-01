import { App, Notice, PluginSettingTab, SecretComponent, SettingDefinitionItem } from 'obsidian';
import { testConnection } from './engine/engine';
import { connectionMessage, errorMessage } from './feedback';
import { normalizeFolder } from './engine/folder';
import type { EngineSettings } from './engine/types';
import type ClickUpTaskConnectPlugin from './main';

export interface ClickUpTaskConnectSettings {
	/** Name of the secret holding the API token. The token itself never reaches `data.json`. */
	apiTokenSecret: string;
	workspaceId: string;
	taskNoteFolder: string;
}

export const DEFAULT_SETTINGS: ClickUpTaskConnectSettings = {
	apiTokenSecret: '',
	workspaceId: '',
	taskNoteFolder: 'ClickUp',
};

/** Keeps known keys only, falling back to defaults for anything missing or mistyped. */
export function readSettings(data: unknown): ClickUpTaskConnectSettings {
	const stored = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
	const text = (key: keyof ClickUpTaskConnectSettings) => {
		const value = stored[key];
		return typeof value === 'string' ? value : DEFAULT_SETTINGS[key];
	};
	return {
		apiTokenSecret: text('apiTokenSecret'),
		workspaceId: text('workspaceId'),
		taskNoteFolder: text('taskNoteFolder'),
	};
}

/** The snapshot an engine run uses. An invalid folder becomes empty, which the engine rejects. */
export function engineSettings(app: App, settings: ClickUpTaskConnectSettings): EngineSettings {
	const token = settings.apiTokenSecret ? app.secretStorage.getSecret(settings.apiTokenSecret) : null;
	return {
		token: token || null,
		workspaceId: settings.workspaceId.trim(),
		taskNoteFolder: normalizeFolder(settings.taskNoteFolder) ?? '',
		scaffoldPath: '',
	};
}

export class ClickUpTaskConnectSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private readonly plugin: ClickUpTaskConnectPlugin,
	) {
		super(app, plugin);
	}

	private async testConnection(): Promise<void> {
		const result = await testConnection(this.plugin.host, this.plugin.engineSettings());
		new Notice(result.ok ? connectionMessage(result) : errorMessage(result.error));
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				type: 'group',
				heading: 'Connection',
				items: [
					{
						name: 'API token',
						desc: 'Personal API token from ClickUp → Settings → Apps. Stored on this device only.',
						aliases: ['clickup', 'token', 'key', 'secret'],
						render: (setting) => {
							setting.addComponent((el) =>
								new SecretComponent(this.app, el)
									.setValue(this.plugin.settings.apiTokenSecret)
									.onChange(async (value) => {
										this.plugin.settings.apiTokenSecret = value;
										await this.plugin.saveSettings();
									}),
							);
						},
					},
					{
						name: 'Workspace ID',
						desc: 'Leave blank to use your only workspace.',
						aliases: ['team', 'workspace'],
						control: { type: 'text', key: 'workspaceId', placeholder: '1234567' },
					},
					{
						name: 'Test connection',
						desc: 'Check which ClickUp user and workspace the token connects to.',
						aliases: ['check', 'verify'],
						action: () => void this.testConnection(),
					},
				],
			},
			{
				type: 'group',
				heading: 'Task notes',
				items: [
					{
						name: 'Task note folder',
						desc: 'Task notes must stay inside this folder (or its subfolders) to be updated.',
						aliases: ['folder', 'location'],
						control: {
							type: 'folder',
							key: 'taskNoteFolder',
							placeholder: DEFAULT_SETTINGS.taskNoteFolder,
							validate: (value) => (normalizeFolder(value) === null ? 'Choose a folder' : undefined),
						},
					},
				],
			},
		];
	}
}
