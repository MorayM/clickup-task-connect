# Refresh behaviour and dropped-task detection

Type: grilling
Status: resolved
Assignee: Moray Macdonald
Blocked by: 02, 08

## Question

- Interval options (e.g. off / 15 min / 1 h), and the deferral before a refresh at startup (after `onLayoutReady`, plus a delay?).
- What happens if a refresh starts while one is already running.
- User feedback: notices on success, failure and "n new tasks"? Silent for interval refreshes?
- Errors: missing or invalid token, offline, rate-limited, partial failure mid-refresh.
- Dropped-task detection: which task notes were "active" last time but are missing now, and how many per-task lookups is it acceptable to make to classify them as closed, unassigned or deleted? Should classified notes be re-checked on later refreshes (e.g. a closed task gets reopened and reassigned)?
- Does a refresh also update managed properties on imported (closed) task notes?

## Answer

Settled with the user (2026-09-30):

- **Trigger**: a **Refresh tasks** command (id `refresh-tasks`) and a ribbon icon (`refresh-cw`, tooltip "Refresh ClickUp tasks").
- **Interval**: a dropdown with Off / 15 min / 30 min / 1 hour / 4 hours, default Off. When it isn't Off, the first refresh runs after `onLayoutReady` plus about 30 s, then on every interval (registered with `registerInterval`). There's no separate "refresh on startup" setting. With the interval off, the plugin makes no network requests unless the user asks.
- **Overlap**: only one refresh runs at a time. A second trigger, manual or interval, is dropped silently, not queued. Import by ID runs independently, because it writes one note through the same update path.
- **Feedback**:
  - A manual refresh shows one notice when it finishes, e.g. "ClickUp: 2 new, 1 renamed, 1 no longer assigned" or "ClickUp: up to date". Notes that failed to write are counted too.
  - An interval refresh is silent on success.
  - Errors always show a notice. For interval refreshes, the same error isn't repeated until a refresh has succeeded in between.
  - There's no status-bar item or progress notice in v1.
- **All-or-nothing listing**: fetch every page (`last_page`, falling back to stopping on a short page) before writing anything. Any failure while listing aborts the refresh with no vault changes:
  - No token: a manual refresh shows "Set your ClickUp API token in settings". An interval refresh doesn't run.
  - 401 with `OAUTH_*`: "Check your API token in settings".
  - Network error or offline: "Couldn't reach ClickUp".
  - 429: "Rate limited, try again in N s", using `X-RateLimit-Reset` in Unix seconds. There's no automatic retry.
- **Applying the listing**: for each listed task, create its task note if none exists. Otherwise set `clickup-state: assigned`, rewrite the managed properties and apply the rename rule from "Filename format and rename behaviour". A failure writing one note doesn't stop the others.
- **Dropped tasks**: notes with `clickup-state: assigned` whose ID isn't in the listing. The note's own state is the record, and the plugin keeps no state of its own.
  - Each dropped note is classified with one Get Task call, one at a time, with no limit.
  - A 200 response sets `closed` (if `status.type == "closed"`) or `not-assigned`, and rewrites the other managed properties from the response.
  - `OAUTH_027` or any other non-200 response (other than those below) sets `gone`, and leaves the other properties unchanged.
  - A 429, a network error or `OAUTH_025` stops the classification. The notes not yet classified stay `assigned`, so the next refresh retries them.
- **Notes in other states**: notes whose state is `closed`, `not-assigned` or `gone` (including imported closed tasks and imported colleagues' tasks) are never re-checked task by task. They're updated only when the task reappears in the assigned listing (then it goes back to `assigned`, which covers reopen-and-reassign) or when the user re-imports it. So a refresh costs one call per 100 assigned tasks plus one per dropped task.
- **Settings**: the interval dropdown belongs to the **Settings surface** fog on the map.
