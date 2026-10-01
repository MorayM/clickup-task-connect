import { App, Notice, PluginSettingTab, SecretComponent, SettingDefinitionItem } from 'obsidian';
import { folderHasTaskNotes, testConnection } from './engine/engine';
import { connectionMessage, errorMessage } from './feedback';
import { normalizeFolder } from './engine/folder';
import type { EngineSettings } from './engine/types';
import type ClickUpTaskConnectPlugin from './main';

export interface ClickUpTaskConnectSettings {
	/** Name of the secret holding the API token. The token itself never reaches `data.json`. */
	apiTokenSecret: string;
	workspaceId: string;
	taskNoteFolder: string;
	/** Blank means the default scaffold. */
	scaffoldPath: string;
	refreshInterval: RefreshInterval;
}

export type RefreshInterval = 'off' | '15m' | '30m' | '1h' | '4h';

const MINUTE = 60_000;
export const REFRESH_INTERVAL_MS: Record<RefreshInterval, number | null> = {
	off: null,
	'15m': 15 * MINUTE,
	'30m': 30 * MINUTE,
	'1h': 60 * MINUTE,
	'4h': 240 * MINUTE,
};

export const DEFAULT_SETTINGS: ClickUpTaskConnectSettings = {
	apiTokenSecret: '',
	workspaceId: '',
	taskNoteFolder: 'ClickUp',
	scaffoldPath: '',
	refreshInterval: 'off',
};

/** Keeps known keys only, falling back to defaults for anything missing or mistyped. */
export function readSettings(data: unknown): ClickUpTaskConnectSettings {
	const stored = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
	const text = (key: Exclude<keyof ClickUpTaskConnectSettings, 'refreshInterval'>) => {
		const value = stored[key];
		return typeof value === 'string' ? value : DEFAULT_SETTINGS[key];
	};
	const interval = stored.refreshInterval;
	return {
		apiTokenSecret: text('apiTokenSecret'),
		workspaceId: text('workspaceId'),
		taskNoteFolder: text('taskNoteFolder'),
		scaffoldPath: text('scaffoldPath'),
		refreshInterval:
			typeof interval === 'string' && interval in REFRESH_INTERVAL_MS
				? (interval as RefreshInterval)
				: DEFAULT_SETTINGS.refreshInterval,
	};
}

/** The snapshot an engine run uses. An invalid folder becomes empty, which the engine rejects. */
export function engineSettings(app: App, settings: ClickUpTaskConnectSettings): EngineSettings {
	const token = settings.apiTokenSecret ? app.secretStorage.getSecret(settings.apiTokenSecret) : null;
	return {
		token: token || null,
		workspaceId: settings.workspaceId.trim(),
		taskNoteFolder: normalizeFolder(settings.taskNoteFolder) ?? '',
		scaffoldPath: settings.scaffoldPath.trim(),
	};
}

export class ClickUpTaskConnectSettingTab extends PluginSettingTab {
	/** The folder when the tab was last opened; only the tab changes it, so it's the value at the last close. */
	private folderWhenOpened: string;

	constructor(
		app: App,
		private readonly plugin: ClickUpTaskConnectPlugin,
	) {
		super(app, plugin);
		this.folderWhenOpened = plugin.settings.taskNoteFolder;
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		await super.setControlValue(key, value);
		if (key === 'refreshInterval') this.plugin.scheduler.reschedule();
	}

	hide(): void {
		super.hide();
		const previous = this.folderWhenOpened;
		const current = this.plugin.settings.taskNoteFolder;
		this.folderWhenOpened = current;
		if (normalizeFolder(previous) === normalizeFolder(current)) return;
		if (folderHasTaskNotes(this.plugin.host, previous)) {
			new Notice("Existing task notes weren't moved. Move them into the new folder to keep them updated.");
		}
	}

	/**
	 * Warns about a missing note but keeps the value, since the note may arrive later by sync.
	 * Returning a message from `validate` blocks the framework's save, so save it here first.
	 */
	private async validateScaffold(value: string): Promise<string | undefined> {
		const path = value.trim();
		if (path === '' || this.app.vault.getFileByPath(path)) return undefined;
		if (this.plugin.settings.scaffoldPath !== value) {
			this.plugin.settings.scaffoldPath = value;
			await this.plugin.saveSettings();
		}
		return 'Note not found';
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
					{
						name: 'Scaffold note',
						desc: 'Note used as the starting body for new task notes, with {=ctc:…=} placeholders. Leave blank for the default.',
						aliases: ['template', 'scaffold', 'placeholder'],
						control: {
							type: 'file',
							key: 'scaffoldPath',
							filter: (file) => file.extension === 'md',
							validate: (value) => this.validateScaffold(value),
						},
					},
				],
			},
			{
				type: 'group',
				heading: 'Refresh',
				items: [
					{
						name: 'Refresh interval',
						desc: 'Refresh task notes in the background. Off means ClickUp is only contacted when you ask.',
						aliases: ['interval', 'automatic', 'background', 'sync'],
						control: {
							type: 'dropdown',
							key: 'refreshInterval',
							options: { off: 'Off', '15m': '15 min', '30m': '30 min', '1h': '1 hour', '4h': '4 hours' },
						},
					},
				],
			},
		];
	}
}
