import { PluginSettingTab, SettingDefinitionItem } from 'obsidian';

export interface ClickUpTaskConnectSettings {
	apiToken: string;
}

export const DEFAULT_SETTINGS: ClickUpTaskConnectSettings = {
	apiToken: '',
};

export class ClickUpTaskConnectSettingTab extends PluginSettingTab {
	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: 'API token',
				desc: 'Personal API token from ClickUp → Settings → Apps.',
				aliases: ['clickup', 'token', 'key'],
				control: {
					type: 'text',
					key: 'apiToken',
					placeholder: 'pk_...',
				},
			},
		];
	}
}
