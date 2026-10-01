# 04: Dropped-task classification

**What to build:** When a task I was assigned no longer appears in a refresh, its task note is kept and its `clickup-state` changes to `closed`, `not-assigned` or `gone`, so I can see what happened. If ClickUp becomes unavailable partway through, unclassified notes stay `assigned` and are retried next time. Notes already marked `closed`, `not-assigned` or `gone` cost nothing on later refreshes, and go back to `assigned` if the task is assigned to me again.

Spec: `.scratch/v1-spec/spec.md` (Managed properties → state derivation, Refresh algorithm steps 4–5); ticket `v1-spec/issues/06`.

**Blocked by:** 02

**Status:** resolved

- [x] **Dropped tasks** are notes with `clickup-state: assigned` whose ID isn't in the listing, excluding duplicates
- [x] Each one is classified with one Get Task call, one at a time
- [x] A 200 response rewrites all managed properties, with state `closed` if `status.type == "closed"`, otherwise `not-assigned` if the user isn't in `assignees`
- [x] `OAUTH_027`, or any other non-200 except those below, sets `clickup-state: gone` only and leaves the other properties unchanged
- [x] 429, a network error or `OAUTH_025` stops classification. The remaining notes stay `assigned`, and the refresh reports the error
- [x] Notes in the `closed`, `not-assigned` and `gone` states are never fetched one by one
- [x] A task that reappears in the listing goes back to `assigned`
- [x] The summary counts closed, not-assigned and gone notes (e.g. "1 no longer assigned")
- [x] Engine tests cover each classification, the interrupted run, no extra fetches, and reassignment

## Comments

- A note whose `clickup-state` is missing or unrecognised (e.g. the user deleted the key) is treated like `assigned` when its task drops out, so it's still classified. Otherwise it could never be settled.
- Dropped notes are classified in path order. A 200 that shows the task still open and assigned (e.g. listing lag) is counted as an ordinary update.
- An interrupted classification still returns the summary, with the stopping error appended: "Stopped checking dropped tasks: …".
