# 10: Android acceptance check

**What to build:** Confirm on a real Android device that the plugin works on mobile through `requestUrl` against api.clickup.com. The docs imply this but don't state it, and it couldn't be checked before the plugin existed (ticket `v1-spec/issues/08`).

**Blocked by:** 06, 08

**Status:** ready-for-human

- [ ] Install the built plugin in the vault on an Android device and enter the API token (secret storage, per device)
- [ ] **Test connection** succeeds
- [ ] A manual **Refresh tasks** creates and updates task notes
- [ ] **Import task by ID** imports a closed task
- [ ] An interval refresh runs in the background
- [ ] Record the outcome (device, Obsidian version) under a `## Comments` heading. If anything fails, open a follow-up ticket
