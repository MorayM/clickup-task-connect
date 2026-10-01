import { Notice } from 'obsidian';
import { refresh, type RefreshMode } from './engine/engine';
import { errorNotice, summaryMessage } from './feedback';
import type ClickUpTaskConnectPlugin from './main';

/** Runs refreshes one at a time and turns their results into notices. */
export class RefreshRunner {
	private running = false;

	constructor(private readonly plugin: ClickUpTaskConnectPlugin) {}

	async run(mode: RefreshMode): Promise<void> {
		// Extra triggers while a refresh is running are dropped.
		if (this.running) return;
		this.running = true;
		try {
			const result = await refresh(this.plugin.host, this.plugin.engineSettings(), mode);
			if (result.ok) new Notice(summaryMessage(result.summary));
			else new Notice(errorNotice(result.error));
		} finally {
			this.running = false;
		}
	}
}
