# 10: Android acceptance check

**What to build:** Confirm on a real Android device that the plugin works on mobile through `requestUrl` against api.clickup.com. The docs imply this but don't state it, and it couldn't be checked before the plugin existed (ticket `v1-spec/issues/08`).

**Blocked by:** 06, 08

**Status:** resolved

- [x] Install the built plugin in the vault on an Android device and enter the API token (secret storage, per device)
- [x] **Test connection** succeeds
- [x] A manual **Refresh tasks** creates and updates task notes
- [x] **Import task by ID** imports a closed task
- [x] An interval refresh runs in the background
- [x] Record the outcome (device, Obsidian version) under a `## Comments` heading. If anything fails, open a follow-up ticket

## Comments

- 2026-10-01: Moray Macdonald reported all Android checks passing: Test connection, manual refresh, import of a closed task, and an interval refresh, via `requestUrl` against api.clickup.com. Device model and Obsidian version weren't recorded.
