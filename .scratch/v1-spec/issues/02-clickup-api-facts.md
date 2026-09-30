# ClickUp API facts for fetching assigned tasks

Type: research
Status: resolved
Blocked by: none

## Question

Using a personal API token, what does the ClickUp API v2 offer for:

1. Finding the authenticated user's ID and their workspace (team) ID from the token alone.
2. Listing every open task assigned to that user across the workspace. Which endpoint and filters? Pagination behaviour and page size? Are subtasks included (`subtasks=true`)? Are archived tasks excluded?
3. Rate limits for personal tokens, and how exceeding them is signalled.
4. Fetching one task by ID (for import, and for classifying tasks that dropped out of a refresh): how the response or error distinguishes **closed** from **no longer assigned** from **deleted/inaccessible** (status codes, `status.type`, `archived`, etc.).
5. The shape of the fields behind the core managed properties: `id` / `custom_id`, `url`, `name`, `status`, `due_date` (format, timezone, whether "time" is set), `priority`, `list`, `parent`, and `description` vs `markdown_description` (how to request markdown).
6. Whether a request can filter by `date_updated_gt` to make refreshes incremental, and whether that catches unassignment.
7. Whether `requestUrl` (no CORS) works with the API from Obsidian mobile. Is there anything that would force desktop-only?

Cite primary sources (developer.clickup.com reference pages).

## Answer

Full findings: branch `research/clickup-api`, file `docs/research/clickup-api.md` (each claim cites a developer.clickup.com or docs.obsidian.md source; unconfirmed points are marked).

1. **IDs from the token.** `GET /v2/user` returns `user.id`, which is an integer. `GET /v2/team` returns `teams[]` with a string `id`. A token can see several workspaces, so the plugin must pick one. Personal tokens go in the header as `Authorization: pk_…` with no `Bearer`, and they never expire.
2. **Assigned open tasks.** Use `GET /v2/team/{team_Id}/task?assignees[]={userId}&subtasks=true&include_markdown_description=true&page=N`. Closed tasks are excluded by default (`include_closed`). Subtasks are excluded by default, so pass `subtasks=true`. Pages hold 100 tasks and start at 0. Unlike the per-List endpoint, this endpoint documents **no `last_page`**, so stop on a short page (unconfirmed). There is no `archived` parameter on this endpoint, and whether archived tasks are excluded is **unconfirmed**. Whether `done`-type statuses count as closed is also **unconfirmed**.
3. **Rate limits.** Limits are per token and depend on the workspace plan: 100/min on Free, Unlimited and Business, 1,000 on Business Plus and 10,000 on Enterprise. Exceeding them returns HTTP 429 with `X-RateLimit-Limit`, `X-RateLimit-Remaining` and `X-RateLimit-Reset` (a Unix timestamp; the unit is unconfirmed).
4. **Classifying drop-outs with Get Task** (`GET /v2/task/{id}`; add `?custom_task_ids=true&team_id=` for custom IDs). Closed shows as `status.type == "closed"` plus `date_closed`/`date_done`. Archived shows as `archived: true`. No longer assigned is a 200 response where our ID is missing from `assignees[].id`. Deleted or inaccessible gives a non-200, but **Get Task documents no error responses**, so nothing says deleted and no-access can be told apart. Treat them as one "gone" state, and keep 401/`OAUTH_*` and 429 separate.
5. **Field shapes.**
   - `id`: string. `custom_id`: string or null.
   - `url`: `https://app.clickup.com/t/{id}`.
   - `status`: `{status, type, color, orderindex, id}`.
   - `due_date` / `start_date`: string of Unix ms in UTC, or null. Task responses document **no `due_date_time` flag**, and date-only values default to 04:00 in the setter's local timezone, so "has time" is not reliably detectable (unconfirmed).
   - `priority`: an object `{id, priority:"normal", color, orderindex}` or null in Get Task, but an integer 1–4 in the Filtered Team Tasks schema. Parse both.
   - `list`: `{id, name, access}`.
   - `parent` / `top_level_parent`: string or null.
   - `description`: plain text. `markdown_description` is returned only with `include_markdown_description=true`.
6. **Incremental refresh.** `date_updated_gt` exists, but with `assignees[]` it can never return tasks you were unassigned from, or that closed or were deleted. So drop-out detection needs a full listing. That is cheap: one call per 100 tasks. Whether unassignment bumps `date_updated` is unconfirmed.
7. **Mobile.** ClickUp's docs say browser `fetch` is blocked by CORS. `requestUrl` is documented as having "no CORS restrictions"; use `throw: false` to read 4xx statuses and headers. Obsidian lists only Node and Electron APIs as unavailable on mobile. Nothing here forces desktop-only. The docs don't explicitly say `requestUrl` works on mobile; this is implied, but test it on a device.
