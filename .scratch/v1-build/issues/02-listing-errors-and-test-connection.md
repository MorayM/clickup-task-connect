# 02: Reliable listing, refresh errors and Test connection

**What to build:** A refresh fetches every page of my assigned tasks before writing anything, so a failure partway through leaves my vault untouched. Every failure shows a clear message. Refreshes don't start before the vault has finished indexing and never overlap. Settings get a **Test connection** action that confirms who I'm connected as and to which workspace, using the same error wording.

Spec: `.scratch/v1-spec/spec.md` (ClickUp API contract, Refresh algorithm step 1, Concurrency, Startup and readiness, Settings schema → Test connection).

**Blocked by:** 01

**Status:** resolved

- [x] The listing pages from 0 until `last_page: true`, falling back to stopping on a short page (fewer than 100 tasks)
- [x] Any listing failure aborts the refresh with no vault changes (tested: page 2 fails → vault unchanged)
- [x] Error results and messages: no token on this device ("Set your ClickUp API token in settings"), 401 `OAUTH_*` ("Check your API token in settings"), network failure ("Couldn't reach ClickUp"), 429 ("Rate limited, try again in N s" from `X-RateLimit-Reset` in Unix seconds), several workspaces with blank ID ("Your token can see several workspaces. Set **Workspace ID** in settings."), workspace ID not found ("Workspace <id> not found"), invalid folder ("Choose a task note folder in settings")
- [x] No automatic retry
- [x] A failure writing one note doesn't stop the others. It's counted, with its path, in the summary
- [x] Final summary wording, e.g. "ClickUp: 2 new, 1 renamed, …" or "ClickUp: up to date"
- [x] The metadata cache's first `resolved` event sets a ready flag. Before that, a manual refresh shows "ClickUp: vault is still indexing, try again in a moment". Confirm whether `resolved` can fire before `onload`, and fall back to `onLayoutReady` if so
- [x] Only one refresh runs at a time. Extra triggers are dropped silently
- [x] Each run uses a snapshot of the settings taken at its start
- [x] The engine's `testConnection` and the **Test connection** settings action show "Connected as <username> to <workspace name>", or list each workspace's name and ID when there are several and the ID is blank. Failures use the refresh wording
- [x] Engine tests cover paging, all-or-nothing, each error classification, and the test-connection outcomes

## Comments

- Readiness: the first `resolved` event *can* come before `onload` — when the plugin is enabled after startup, the initial index has already finished and `resolved` only fires again on the next file change. Instead of an `onLayoutReady` fallback, the adapter treats the index as ready once `resolved` has fired **or** every markdown file in the task note folder already has a metadata cache entry. Only that folder's notes affect duplicate detection, so this is the precise condition and costs one pass over the folder.
- A listing failure that isn't classified (e.g. HTTP 500) reports "ClickUp returned an error (HTTP 500)".
