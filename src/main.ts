import { Plugin } from 'obsidian';
import { registerCommands } from './commands';
import type { EngineSettings } from './engine/types';
import { ObsidianHost } from './obsidian-host';
import { RefreshRunner } from './refresh-runner';
import {
	ClickUpTaskConnectSettings,
	ClickUpTaskConnectSettingTab,
	engineSettings,
	readSettings,
} from './settings';

export default class ClickUpTaskConnectPlugin extends Plugin {
	settings!: ClickUpTaskConnectSettings;
	host!: ObsidianHost;
	runner!: RefreshRunner;
	private cacheResolved = false;

	async onload() {
		await this.loadSettings();
		this.host = new ObsidianHost(this.app, () => this.cacheResolved);
		this.runner = new RefreshRunner(this);
		this.registerEvent(
			this.app.metadataCache.on('resolved', () => {
				this.cacheResolved = true;
			}),
		);
		this.addSettingTab(new ClickUpTaskConnectSettingTab(this.app, this));
		registerCommands(this);
	}

	/** A snapshot of the settings for one engine run. */
	engineSettings(): EngineSettings {
		return engineSettings(this.app, this.settings);
	}

	async loadSettings() {
		this.settings = readSettings(await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
