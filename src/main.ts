import { Plugin } from 'obsidian';
import {
	ClickUpTaskConnectSettings,
	ClickUpTaskConnectSettingTab,
	DEFAULT_SETTINGS,
} from './settings';

export default class ClickUpTaskConnectPlugin extends Plugin {
	settings!: ClickUpTaskConnectSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new ClickUpTaskConnectSettingTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<ClickUpTaskConnectSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
