import { Notice } from 'obsidian';
import { refresh, type RefreshMode } from './engine/engine';
import { errorNotice, IntervalNotices, summaryMessage } from './feedback';
import type ClickUpTaskConnectPlugin from './main';

/** Runs refreshes one at a time and turns their results into notices. */
export class RefreshRunner {
	private running = false;
	private readonly intervalNotices = new IntervalNotices();

	constructor(private readonly plugin: ClickUpTaskConnectPlugin) {}

	async run(mode: RefreshMode): Promise<void> {
		// Extra triggers while a refresh is running are dropped.
		if (this.running) return;
		this.running = true;
		try {
			// Each run uses the settings as they were when it started.
			const result = await refresh(this.plugin.host, this.plugin.engineSettings(), mode);
			if (mode === 'interval') {
				const notice = this.intervalNotices.noticeFor(result);
				if (notice !== null) new Notice(notice);
				return;
			}
			this.intervalNotices.recordManual(result);
			new Notice(result.ok ? summaryMessage(result.summary) : errorNotice(result.error));
		} finally {
			this.running = false;
		}
	}
}
