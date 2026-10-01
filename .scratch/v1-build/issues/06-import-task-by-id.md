# 06: Import task by ID

**What to build:** **Import task by ID** opens a modal where I paste a task ID or ClickUp URL. The plugin creates a task note for that task (or updates the existing one) and opens it. This works for closed tasks and colleagues' tasks, which a refresh never fetches. Problems are shown inside the modal so I can fix them and try again.

Spec: `.scratch/v1-spec/spec.md` (Import); ticket `v1-spec/issues/07`.

**Blocked by:** 02, 03, 05

**Status:** resolved

- [x] Command id `import-task`, name **Import task by ID**, opens a prompt modal
- [x] Input is trimmed. A URL (`…/t/<id>` or `…/t/<workspace>/<id>`) gives its last path segment. Input that doesn't look like an ID is rejected inline with no request made
- [x] The engine's `importTask` fetches the task with Get Task. With no existing note it creates one (filename rule, scaffold, managed properties). With one existing note it updates the managed properties and applies the rename rule, never touching the body
- [x] State is derived as usual: closed tasks get `closed`, and tasks not assigned to the user get `not-assigned`
- [x] For a subtask, only that task is imported, with `clickup-parent` set to the parent's ID
- [x] On success the modal closes and the note opens
- [x] On failure the modal stays open with an inline error and no note is created: not found ("Task not found or not accessible"), bad token, offline, rate limited (with the wait time), duplicates ("2 notes have this task ID: A, B"), scaffold not found, vault still indexing
- [x] Import isn't blocked by a running refresh
- [x] Engine tests cover the ID and URL forms, rejected input with no request, create versus update, closed and colleague tasks, and each error

## Comments

- "Looks like an ID" means 5–15 letters and digits with at least one digit (e.g. `86c0abcde`). URLs must have the `/t/<id>` or `/t/<workspace>/<id>` path; a missing scheme is accepted.
- Duplicates are detected from the vault before any request is made.
- A taken target path is reported inline as "Couldn't write <path>: A file with this name already exists".
