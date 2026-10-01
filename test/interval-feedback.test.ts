import { describe, expect, it } from 'vitest';
import type { EngineError, RefreshSummary } from '../src/engine/engine';
import { IntervalNotices } from '../src/feedback';

const summary = (extra: Partial<RefreshSummary> = {}): RefreshSummary => ({
	created: 1,
	updated: 0,
	renamed: 0,
	closed: 0,
	notAssigned: 0,
	gone: 0,
	duplicates: 0,
	failures: [],
	...extra,
});
const success = { ok: true as const, summary: summary() };
const failure = (error: EngineError) => ({ ok: false as const, error });

describe('interval refresh notices', () => {
	it('stays silent on success', () => {
		expect(new IntervalNotices().noticeFor(success)).toBeNull();
	});

	it('shows an error once, and again only after a success in between', () => {
		const notices = new IntervalNotices();

		const first = notices.noticeFor(failure({ kind: 'offline' }));
		const repeat = notices.noticeFor(failure({ kind: 'offline' }));
		notices.noticeFor(success);
		const afterSuccess = notices.noticeFor(failure({ kind: 'offline' }));

		expect(first).toBe("ClickUp: couldn't reach ClickUp");
		expect(repeat).toBeNull();
		expect(afterSuccess).toBe("ClickUp: couldn't reach ClickUp");
	});

	it('counts a successful manual refresh as the success in between', () => {
		const notices = new IntervalNotices();
		notices.noticeFor(failure({ kind: 'offline' }));

		notices.recordManual(failure({ kind: 'rate-limited', waitSeconds: 3 }));
		const afterManualFailure = notices.noticeFor(failure({ kind: 'offline' }));
		notices.recordManual(success);
		const afterManualSuccess = notices.noticeFor(failure({ kind: 'offline' }));

		expect(afterManualFailure).toBeNull();
		expect(afterManualSuccess).toBe("ClickUp: couldn't reach ClickUp");
	});

	it('shows a different error straight away', () => {
		const notices = new IntervalNotices();
		notices.noticeFor(failure({ kind: 'offline' }));

		expect(notices.noticeFor(failure({ kind: 'rate-limited', waitSeconds: 20 }))).toBe(
			'ClickUp: rate limited, try again in 20 s',
		);
		expect(notices.noticeFor(failure({ kind: 'rate-limited', waitSeconds: 5 }))).toBeNull();
	});

	it('skips silently with no token or while indexing, without counting as a success', () => {
		const notices = new IntervalNotices();
		notices.noticeFor(failure({ kind: 'offline' }));

		expect(notices.noticeFor(failure({ kind: 'no-token' }))).toBeNull();
		expect(notices.noticeFor(failure({ kind: 'indexing' }))).toBeNull();
		expect(notices.noticeFor(failure({ kind: 'offline' }))).toBeNull();
	});

	it('treats an interrupted classification as an error', () => {
		const notices = new IntervalNotices();
		const interrupted = { ok: true as const, summary: summary({ interrupted: { kind: 'offline' } }) };

		expect(notices.noticeFor(interrupted)).toBe("ClickUp: stopped checking dropped tasks: couldn't reach ClickUp");
		expect(notices.noticeFor(interrupted)).toBeNull();
	});
});
