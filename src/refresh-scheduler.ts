import type ClickUpTaskConnectPlugin from './main';
import { REFRESH_INTERVAL_MS } from './settings';

const FIRST_RUN_DELAY_MS = 30_000;

/** Runs interval refreshes. Timers are registered with the plugin so they stop on unload. */
export class RefreshScheduler {
	private timeout: number | null = null;
	private interval: number | null = null;

	constructor(private readonly plugin: ClickUpTaskConnectPlugin) {
		plugin.register(() => this.stop());
	}

	/** At startup: first run about 30 s after layout ready, then every interval. */
	startAfterLayoutReady(): void {
		this.plugin.app.workspace.onLayoutReady(() => {
			this.stop();
			const ms = this.intervalMs();
			if (ms === null) return;
			this.timeout = window.setTimeout(() => {
				this.timeout = null;
				this.tick();
				this.every(ms);
			}, FIRST_RUN_DELAY_MS);
		});
	}

	/** After a settings change: a new timer straight away, first run one full interval later. */
	reschedule(): void {
		this.stop();
		const ms = this.intervalMs();
		if (ms !== null) this.every(ms);
	}

	private every(ms: number): void {
		this.interval = this.plugin.registerInterval(window.setInterval(() => this.tick(), ms));
	}

	private tick(): void {
		void this.plugin.runner.run('interval');
	}

	private intervalMs(): number | null {
		return REFRESH_INTERVAL_MS[this.plugin.settings.refreshInterval];
	}

	private stop(): void {
		if (this.timeout !== null) window.clearTimeout(this.timeout);
		if (this.interval !== null) window.clearInterval(this.interval);
		this.timeout = null;
		this.interval = null;
	}
}
