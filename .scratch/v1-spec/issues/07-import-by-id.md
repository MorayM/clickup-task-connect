# Import-by-ID command

Type: grilling
Status: resolved
Blocked by: 02

## Question

- Input: accept a bare ID and/or a pasted task URL? (Custom IDs are out of scope. See "Filename format and rename behaviour".)
- UX: a prompt modal? Should it open the note afterwards, and optionally insert a link at the cursor?
- If a task note for that ID already exists: open it, refresh its managed properties, or both?
- Can it import tasks not assigned to the user (e.g. a colleague's task you want to reference)? If so, what state marker does such a note carry?

## Answer

Settled with the user (2026-09-30):

- **Command**: **Import task by ID** opens a small prompt modal.
- **Input**: a bare task ID or a pasted task URL (`https://app.clickup.com/t/<id>` or `…/t/<workspace>/<id>`). For a URL, use the last path segment. Trim whitespace. If the input doesn't look like an ID, reject it in the modal without making a request.
- **Fetch**: Get Task (`GET /v2/task/{id}`). This works for any task the token can see, whether open, closed, assigned to someone else or unassigned.
- **New task**: create the task note (filename per "Filename format and rename behaviour", body from the scaffold, managed properties), then open it.
- **Existing task note** (matched by `clickup-id`): update its managed properties from the fetched task using the same code path as a refresh, then open it. Never create a second note, and never touch the body.
- **Not assigned to the user**: allowed. The state marker such a note carries is decided in "Managed property names and value formats". Whether later refreshes keep it updated is decided in "Refresh behaviour and dropped-task detection".
- **Subtasks**: import only the requested task. `parent` records the parent's ID, and the parent is not imported.
- **Failures**: keep the modal open with an inline error and create no note. The errors are: not found or not accessible (any non-200 other than 401/429), invalid token (401/`OAUTH_*`: "Check your API token in settings"), offline or network error ("Couldn't reach ClickUp"), and rate limited (429, with wait time from `X-RateLimit-Reset`).
- **Inserting a link at the cursor** after import is not part of this command. It belongs with the daily-note helpers in the map's Not yet specified list.
