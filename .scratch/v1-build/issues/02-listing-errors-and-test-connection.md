# 02: Reliable listing, refresh errors and Test connection

**What to build:** A refresh fetches every page of my assigned tasks before writing anything, so a failure partway through leaves my vault untouched. Every failure shows a clear message. Refreshes don't start before the vault has finished indexing and never overlap. Settings get a **Test connection** action that confirms who I'm connected as and to which workspace, using the same error wording.

Spec: `.scratch/v1-spec/spec.md` (ClickUp API contract, Refresh algorithm step 1, Concurrency, Startup and readiness, Settings schema → Test connection).

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] The listing pages from 0 until `last_page: true`, falling back to stopping on a short page (fewer than 100 tasks)
- [ ] Any listing failure aborts the refresh with no vault changes (tested: page 2 fails → vault unchanged)
- [ ] Error results and messages: no token on this device ("Set your ClickUp API token in settings"), 401 `OAUTH_*` ("Check your API token in settings"), network failure ("Couldn't reach ClickUp"), 429 ("Rate limited, try again in N s" from `X-RateLimit-Reset` in Unix seconds), several workspaces with blank ID ("Your token can see several workspaces. Set **Workspace ID** in settings."), workspace ID not found ("Workspace <id> not found"), invalid folder ("Choose a task note folder in settings")
- [ ] No automatic retry
- [ ] A failure writing one note doesn't stop the others. It's counted, with its path, in the summary
- [ ] Final summary wording, e.g. "ClickUp: 2 new, 1 renamed, …" or "ClickUp: up to date"
- [ ] The metadata cache's first `resolved` event sets a ready flag. Before that, a manual refresh shows "ClickUp: vault is still indexing, try again in a moment". Confirm whether `resolved` can fire before `onload`, and fall back to `onLayoutReady` if so
- [ ] Only one refresh runs at a time. Extra triggers are dropped silently
- [ ] Each run uses a snapshot of the settings taken at its start
- [ ] The engine's `testConnection` and the **Test connection** settings action show "Connected as <username> to <workspace name>", or list each workspace's name and ID when there are several and the ID is blank. Failures use the refresh wording
- [ ] Engine tests cover paging, all-or-nothing, each error classification, and the test-connection outcomes
