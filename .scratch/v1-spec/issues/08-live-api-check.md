# Live API check of unconfirmed ClickUp behaviour

Type: task
Status: resolved
Blocked by: none

## Question

The research in ticket 02 left some behaviour unconfirmed by the docs. Confirm each one against the real workspace with the user's token. This is HITL: it needs the token, a test task, and ideally a phone.

- Does the workspace-wide task listing exclude archived tasks and "done"-type (not just "closed") statuses by default?
- Can a date-only due date be told apart from a date+time one in the task response (e.g. a `due_date_time` field, or always 04:00 local)?
- Which `priority` shape does the workspace-wide listing actually return: object or integer?
- What does Get Task return for a deleted task, and for a task in a space the token can't access (status code and body)?
- Does the workspace-wide listing stop with a short page, or does it have a `last_page` flag?
- What unit does `X-RateLimit-Reset` use?
- Does `requestUrl` to api.clickup.com work from Obsidian mobile?

Record the raw findings (with secrets redacted) in the answer.

## Answer

Run on 2026-09-30 against the user's workspace with a read-only probe script (GET requests only; the token was held in a scratch file and deleted afterwards). The workspace has 1 workspace, 12 open assigned tasks and 187 including closed ones.

- **Listing excludes closed tasks by default.** The default listing returned 12 tasks (types `open`/`unstarted`); `include_closed=true` returned 187 (175 `closed`). This workspace has no `done`-type statuses (only `backlog`=open, `to do`=unstarted, `Closed`=closed), so how `done` is handled is still unknown, and doesn't matter here. None of the 187 tasks were archived, so whether archived tasks are excluded is still unconfirmed.
- **`last_page` exists** on the workspace-wide listing response (top-level keys `last_page`, `tasks`), despite not being documented. Use it, falling back to stopping on a short page.
- **`priority` is an object** `{id, priority, color, orderindex}` or `null` in *both* the listing and Get Task. No integers were seen. Values seen: `urgent`, `high`, `normal`, `low`.
- **Date-only vs date+time**: there's no `due_date_time` or `start_date_time` field in either response. All 19 due dates in the workspace fall at **04:00 local time**, which is ClickUp's marker for "no time set". The only signal is the heuristic "04:00 local means date-only". The decision on how to use that belongs to the managed-properties ticket.
- **Get Task for a nonexistent ID returns HTTP 401** `{"err":"Team not authorized","ECODE":"OAUTH_027"}`, not a 404. An invalid token returns HTTP 401 `{"err":"Token invalid","ECODE":"OAUTH_025"}`. **A 401 status alone can't tell "bad token" from "task gone"; the `ECODE` must be checked.** Deleted and no-access tasks weren't probed separately (the user supplied no IDs); assume they look like OAUTH_027.
- **`X-RateLimit-Reset` is in Unix seconds** (1790791327 against a local time of 1790791266.67, about 60 s ahead). Limit 100/min.
- **Subtasks**: 13 of 187 tasks have a `parent`. None of the 12 open tasks is a subtask. Get Task on a parent ID works.
- Useful fields present in both responses: `date_closed`, `date_done`, `date_updated`, `space`, `folder`, `list`, `tags`, `custom_fields`, `top_level_parent`, `markdown_description`.
- **Mobile `requestUrl`**: not tested. It can't be tested before the plugin exists, so it's carried into the spec as an acceptance check on Android.
