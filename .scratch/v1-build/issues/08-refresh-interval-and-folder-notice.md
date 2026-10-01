# 08: Refresh interval and folder-moved notice

**What to build:** I can choose a refresh interval, and task notes then stay current in the background without nagging me. Errors are shown once until things recover. If I change the task note folder, I'm told once, when I close settings, that existing notes weren't moved.

Spec: `.scratch/v1-spec/spec.md` (Settings schema → Refresh interval, folder notice; Startup and readiness); tickets `v1-spec/issues/06` and `12`.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] **Refresh interval** dropdown: Off / 15 min / 30 min / 1 hour / 4 hours, default Off
- [ ] When it isn't Off, the first run is after `onLayoutReady` plus about 30 s, then every interval, registered with `registerInterval`
- [ ] Changing the interval clears the current timer and registers a new one straight away, with no immediate run. Off stops the timer
- [ ] Interval runs are silent on success
- [ ] Interval errors show a notice, and the same error isn't shown again until a refresh has succeeded in between
- [ ] Interval runs with no token, or before the vault has finished indexing, skip silently and wait for the next tick
- [ ] Interval runs share the single in-flight guard with manual refreshes
- [ ] With the interval Off, the plugin makes no network requests unless the user asks for one
- [ ] When the settings tab closes (`hide()`), if the folder differs from its value when the tab opened and the old folder held at least one task note, it shows once: "Existing task notes weren't moved. Move them into the new folder to keep them updated."
- [ ] The rule for repeating errors is covered by tests at whatever seam it lives behind, or checked manually if it stays in the thin plugin shell
