# Spec: ClickUp Task Connect v1

Status: ready-for-agent

Synthesised from the resolved tickets in `map.md` (01–12). When this spec and a ticket disagree, the ticket's `## Answer` is the source of the decision. Terms in **bold** are defined in `CONTEXT.md`.

## Problem Statement

I keep my work in ClickUp and my thinking in Obsidian. When I write a daily note or a meeting note, I want to link to the ClickUp task I'm working on, the same way I link to any other note. But a ClickUp task has no presence in my vault. I end up pasting ClickUp URLs, retyping task names, or keeping hand-made notes that go stale as soon as a task is renamed, re-prioritised, closed or reassigned. There's no reliable way to see from inside the vault which tasks are currently mine, when they're due, or what happened to a task I was writing about last month.

## Solution

The plugin keeps one **task note** per ClickUp task assigned to me, in one folder of my vault. Each task note carries a fixed set of **managed properties** (ID, URL, title, status, due date, priority, list, parent and **state**) that the plugin rewrites from ClickUp on every **refresh**. Its **body** is written once from a **scaffold** and is mine from then on. The flow is strictly one way, ClickUp → vault; the plugin never writes to ClickUp.

A refresh (from a command, a ribbon icon or an optional interval) creates notes for newly assigned tasks and updates existing ones. It renames a note when the task is renamed, unless I've renamed the note myself. It also marks tasks that have left my list as closed, not assigned to me, or gone, and never deletes them. A separate **import** creates or updates a task note for any task by ID or URL, including closed tasks and colleagues' tasks. An **Insert link to task** picker lets me link an assigned task from any note. Because the properties are typed and fixed, I can build Bases views over them, and the README ships examples.

## User Stories

### Connection and settings

1. As a user, I want to enter my ClickUp personal API token once per device in Obsidian's secret storage, so that the token never sits in a synced `data.json` file.
2. As a user, I want `data.json` to hold only the name of the secret, so that my other devices know which secret to use without the token itself syncing.
3. As a user with one workspace, I want the plugin to use it automatically, so that I don't have to look up a workspace ID.
4. As a user whose token can see several workspaces, I want a clear error asking me to set **Workspace ID**, so that the plugin never guesses which workspace I meant.
5. As a user, I want a **Test connection** action that tells me who I'm connected as and to which workspace, so that I can confirm my setup before refreshing.
6. As a user with several workspaces, I want **Test connection** to list each workspace's name and ID, so that I can copy the right ID into settings.
7. As a user, I want no network request made while I type into settings, so that half-typed tokens aren't sent anywhere.
8. As a user, I want to choose the task note folder (default `ClickUp`), so that task notes live where I expect.
9. As a user, I want the vault root and empty values rejected as the task note folder, so that the plugin never scans my whole, large vault.
10. As a user, I want the folder created on first write rather than when I change the setting, so that changing my mind doesn't leave empty folders behind.
11. As a user who changes the folder, I want one notice when I close the settings tab, telling me existing task notes weren't moved, so that I know to move them myself.
12. As a user, I want to pick an optional scaffold note, so that new task notes start with my own layout.
13. As a user, I want a "Note not found" warning for a scaffold path that doesn't exist, while the value is still saved, so that I can point at a note that will arrive by sync later.
14. As a user, I want to choose a refresh interval (Off, 15 min, 30 min, 1 hour, 4 hours; default Off), so that task notes stay current without my doing anything.
15. As a user, I want an interval change to take effect straight away without triggering an immediate refresh, so that settings changes are predictable.
16. As a user, I want all settings to appear in Obsidian's settings search, so that I can find them quickly.
17. As a privacy-minded user, I want the plugin to make no network requests unless I ask or have enabled the interval, so that it stays offline by default.

### Refresh

18. As a user, I want a **Refresh tasks** command and a ribbon icon, so that I can pull my assigned tasks whenever I like.
19. As a user, I want a refresh to create a task note for every open task assigned to me, including subtasks, so that each one can be linked.
20. As a user, I want a refresh to rewrite the managed properties of existing task notes, so that status, due date, priority and list stay current.
21. As a user, I want a refresh never to touch my note body, so that my own writing is safe.
22. As a user, I want a refresh never to touch frontmatter keys the plugin doesn't own, nor reorder them, so that my own properties are safe.
23. As a user, I want a managed property I deleted to come back on the next write, so that every task note always has all nine keys.
24. As a user, I want a manual refresh to end with one summary notice (for example "2 new, 1 renamed, 1 no longer assigned", or "up to date"), so that I know what changed.
25. As a user, I want interval refreshes to be silent on success, so that background updates don't nag me.
26. As a user, I want errors from interval refreshes shown once and not repeated until a refresh has succeeded, so that a long outage doesn't flood me with notices.
27. As a user, I want a refresh that can't fetch the full listing to change nothing in my vault, so that a network blip never makes all my tasks look dropped.
28. As a user, I want a clear message when my token is missing, invalid or rate-limited, or when ClickUp is unreachable, so that I know what to fix.
29. As a user, I want a rate-limited refresh to tell me how many seconds to wait, so that I don't retry too early.
30. As a user, I want a second refresh trigger that arrives during a refresh to be ignored, so that two runs never write to the same notes at once.
31. As a user, I want the first interval refresh to wait until about 30 s after the workspace has loaded, so that startup stays fast.
32. As a user, I want a refresh started before the vault has finished indexing to tell me to try again shortly (or, for an interval refresh, wait for the next tick), so that no duplicate notes are created from an incomplete index.
33. As a user, I want a refresh or import to use a snapshot of settings from when it started, so that editing settings mid-run doesn't produce mixed results.
34. As a user, I want a failure writing one note not to stop the others, and to be counted in the summary, so that one bad file doesn't block everything.

### Dropped tasks and state

35. As a user, I want a task that has left my assigned list to keep its note, so that links from old daily notes still work.
36. As a user, I want a dropped task's note marked `closed`, `not-assigned` or `gone`, so that I can see what happened to it.
37. As a user, I want `closed` to win when a task is both closed and no longer mine, so that the state reflects the most final fact.
38. As a user, I want a `closed` or `not-assigned` note's other managed properties updated from ClickUp when it's classified, so that its final status and due date are accurate.
39. As a user, I want a `gone` note's other properties left as they were, so that the last known details are kept.
40. As a user, I want a refresh interrupted during classification to leave the rest `assigned` for next time, so that nothing is mislabelled.
41. As a user, I want notes that are already `closed`, `not-assigned` or `gone` not to be checked again on each refresh, so that refreshes stay cheap.
42. As a user, I want a task that's reopened and reassigned to me to go back to `assigned` on the next refresh, so that the state is never stuck.
43. As a user, I want the `clickup-state` property kept separate from ClickUp's own `clickup-status`, so that I can filter on either.

### Filenames

44. As a user, I want task notes named `<task name> (<task ID>).md`, so that names read naturally in links and stay unique.
45. As a user, I want characters that are illegal on any OS, or that break wikilinks, removed from the name part, so that notes sync to every device and link cleanly.
46. As a user, I want the name part capped at 100 characters without ever cutting the ID, so that paths stay manageable.
47. As a user, I want a task with an empty cleaned name to be named `(<id>).md`, so that it still gets a note.
48. As a user, I want a note renamed (with links updated) when its task is renamed in ClickUp, so that filenames stay meaningful.
49. As a user who renamed a task note myself, I want the plugin to leave my filename alone, so that my choice is respected.
50. As a user, I want a create skipped and reported when the target path already exists, so that the plugin never writes into a file it didn't make.
51. As a user, I want a rename that would collide with an existing file to quietly keep the current name, so that nothing is overwritten.

### Finding task notes and duplicates

52. As a user, I want task notes found by `clickup-id`, not by filename or path, so that renaming or reorganising them within the folder doesn't break anything.
53. As a user, I want task notes in subfolders of the task note folder to still count, so that I can organise them.
54. As a user, I want two notes with the same `clickup-id` to be left alone and reported, so that the plugin never guesses which one is real.
55. As a user, I want the README to explain that notes moved out of the folder, or whose `clickup-id` I edit, stop being updated, so that I'm not surprised.

### Scaffold and placeholders

56. As a user, I want a sensible default body (an **Open in ClickUp** link, the description and a `## Notes` heading) when I haven't set a scaffold note, so that the plugin works out of the box.
57. As a user, I want `{=ctc:…=}` placeholders for every managed property value (`id`, `url`, `title`, `status`, `due`, `priority`, `list`, `parent`, `state`), so that my scaffold can show them in the body.
58. As a user, I want extra placeholders (`description`, `space`, `folder`, `tags`, `assignees`, `creator`, `created`, `start`, `today`, `raw`), so that my scaffold can include more task detail than the properties hold.
59. As a user, I want `{=ctc:description=}` to insert ClickUp's markdown description with images left as remote links, so that the content reads well and nothing is downloaded.
60. As a user, I want `{=ctc:raw=}` to insert the task JSON in a fenced code block, so that I can reach custom fields or anything else not exposed.
61. As a user, I want unknown placeholders left as written, so that typos are visible.
62. As a user, I want known placeholders with no value to become empty, so that the body doesn't contain leftover tokens.
63. As a user, I want placeholders in the scaffold's frontmatter filled in safely, so that values with colons, hashes or quotes can't break YAML.
64. As a user, I want managed properties to win over same-named keys in my scaffold's frontmatter, so that the plugin's data stays consistent.
65. As a user whose scaffold note is set but missing, I want new task notes not created (with a "Scaffold note not found" message) while existing notes still update, so that no note is ever created with the wrong body.
66. As a user of other templating plugins, I want only `{=ctc:…=}` tokens rendered and everything else copied as-is, so that Templater syntax and the like pass through untouched.

### Managed property values

67. As a user, I want `clickup-due` always written as a `YYYY-MM-DD` date in local time, so that it sorts and filters as a date in Bases.
68. As a user, I want `clickup-priority` as a label (`urgent`, `high`, `normal`, `low`), so that it's readable.
69. As a user, I want `clickup-list` as the list name and `clickup-parent` as the parent's bare ID, so that values are plain and predictable.
70. As a user, I want empty values written as null instead of removed, so that every task note has the same keys.
71. As a user, I want `clickup-title` to keep the task name unmodified, so that I have the exact name even when the filename is cleaned.

### Import

72. As a user, I want an **Import task by ID** command that accepts a bare ID or a pasted task URL, so that I can bring any task into my vault.
73. As a user, I want to import closed tasks, so that I can link to past work that a refresh never fetches.
74. As a user, I want to import a colleague's task, marked `not-assigned`, so that I can reference work I'm not doing.
75. As a user, I want importing a task that already has a note to update its managed properties and open it, never creating a second note, so that import is safe to repeat.
76. As a user, I want the imported note opened afterwards, so that I can start writing straight away.
77. As a user, I want invalid input rejected in the modal before any request, so that typos don't waste API calls.
78. As a user, I want import failures (not found, bad token, offline, rate limited, duplicates, missing scaffold, vault still indexing) shown inline in the modal, with the modal kept open, so that I can correct and retry.
79. As a user importing a subtask, I want only that task imported with its parent's ID recorded, so that I don't get unexpected notes.

### Linking

80. As a user writing a daily note, I want an **Insert link to task** command that opens a picker of my assigned task notes, so that I can link the task I'm working on in a few keystrokes.
81. As a user, I want the picker to match on task title, list and ID from the frontmatter, so that it still works after I rename a note.
82. As a user, I want each picker entry to show the title plus status, due date and list, so that I can tell similar tasks apart.
83. As a user, I want the picker sorted by due date (soonest first, undated last) before I type, so that urgent tasks are at the top.
84. As a user, I want the inserted link to follow my vault's link-format settings, with no alias, so that it matches the rest of my vault.
85. As a user with no assigned task notes, I want a notice telling me to refresh first, instead of an empty picker, so that I know what to do.
86. As a user, I want the README to include example `.base` files for "my open tasks" and "due today", so that I can get a task view without the plugin shipping one.

### Platform

87. As a mobile user, I want the plugin to work on Android and iOS, so that my task notes stay current wherever I write.
88. As a user, I want the plugin to unload cleanly, with no leftover timers or listeners, so that disabling or updating it is safe.

## Implementation Decisions

### Architecture

- **Engine plus host port.** All behaviour lives in a task-note engine that doesn't depend on Obsidian at runtime. It depends on a single host port: a narrow interface covering ClickUp HTTP (a `requestUrl`-shaped call that returns status, headers and JSON and never throws on 4xx) plus the vault operations the engine needs. Those operations are: list the markdown files under a folder with their parsed frontmatter, create a folder, create a file with content, apply a frontmatter mutation (backed by `processFrontMatter`), rename a file with link updates (backed by `FileManager.renameFile`), read a note's text, check whether a path exists, and give the current date and time zone. The Obsidian adapter that implements this port is thin glue.
- **Engine operations** (the public surface):
  - `refresh(settingsSnapshot, mode)`: `mode` is manual or interval. Returns a summary (counts of new, updated, renamed, closed, not-assigned and gone notes, plus duplicates and failures, with failure details) or a typed error.
  - `importTask(settingsSnapshot, rawInput)`: returns the created or updated note's path, or a typed error suitable for inline display.
  - `listAssignedTaskNotes(settingsSnapshot)`: the data the link picker needs (file, title, status, due, list, ID), already sorted.
  - `testConnection(settingsSnapshot)`: returns the user's name with the workspace, or a list of workspaces, or a typed error.
- **Internal modules behind the engine** (deep modules, not separately tested): a ClickUp client (user, team, paged assigned listing, Get Task, error classification by HTTP status plus `ECODE`), task → managed-property mapping, filename builder and cleaner, scaffold renderer (frontmatter through YAML parse and fill, body through text replacement), and the task note index (a per-run ID → notes map built from a folder scan).
- **Plugin shell.** `main.ts` handles only the lifecycle: loading settings, registering the settings tab, the three commands, the ribbon icon, the interval and the metadata-cache `resolved` listener that sets the ready flag. The UI modules are the import modal, the link picker (`SuggestModal`) and the settings tab. Notice text and the "repeat interval errors only after a success" rule live in a small feedback module that formats engine results.
- **Concurrency.** A single in-flight flag guards refresh. Overlapping triggers are dropped silently. Import isn't blocked by a running refresh.

### ClickUp API contract (confirmed against the live workspace)

- Auth header `Authorization: <token>` (no `Bearer`). All requests go through `requestUrl` with `throw: false`.
- Identity: `GET /v2/user` gives `user.id` (integer); `GET /v2/team` gives `teams[]` (string `id`).
- Listing: `GET /v2/team/{teamId}/task?assignees[]={userId}&subtasks=true&include_markdown_description=true&page=N`, starting at page 0 with 100 per page. Stop on `last_page: true`, or on a short page as a fallback. Closed tasks are excluded by default. Every page is fetched before anything is written.
- Get Task: `GET /v2/task/{id}?include_markdown_description=true`.
- Error classification: 401 with `ECODE` `OAUTH_025` (or any other `OAUTH_*` on the listing or user calls) is a bad token. 401 `OAUTH_027` on Get Task means the task is gone or not found. 429 is rate-limited, with the wait from `X-RateLimit-Reset` (Unix seconds) minus now. A thrown or failed request is "Couldn't reach ClickUp". During classification, any other non-200 counts as gone.
- `priority` is an object (`{priority: "urgent" | …}`) or null. Parse an integer defensively anyway. Dates are strings of Unix ms. `due` is converted to a local date and any time of day is dropped.
- No automatic retry. A refresh costs one call per 100 assigned tasks plus one per dropped task.

### Managed properties (schema)

There are exactly nine keys, always all present, always written through `processFrontMatter`, and never touching other keys:

| Key | Value |
|---|---|
| `clickup-id` | Internal task ID, string |
| `clickup-url` | Task `url` |
| `clickup-title` | Task `name`, unmodified |
| `clickup-status` | `status.status` as returned |
| `clickup-due` | `YYYY-MM-DD` local, or null |
| `clickup-priority` | `urgent` / `high` / `normal` / `low`, or null |
| `clickup-list` | `list.name` |
| `clickup-parent` | Parent ID string, or null |
| `clickup-state` | `assigned` / `closed` / `not-assigned` / `gone` |

- State derivation from a task: `status.type == "closed"` gives `closed`. Otherwise, if the user is in `assignees[].id` the state is `assigned`, and if not it's `not-assigned`. `gone` is set only by classification after a failed Get Task. In that case only `clickup-state` changes.
- No custom fields, timestamps, tags or assignees as properties in v1.

### Refresh algorithm

1. Fail early, with no vault changes, when: the metadata cache isn't ready; there's no token on this device; the folder setting is invalid; the workspace can't be resolved (several workspaces with a blank ID, or the ID not found); or any listing call fails.
2. Scan the task note folder (recursively) into an ID → notes map. IDs are compared as `String(value).trim()`; a value that is neither a string nor a number isn't an ID.
3. For each listed task:
   - **Duplicates**: skip the task and count it.
   - **No note**:
     - If the scaffold is set but unreadable, record "Scaffold note not found: <path>" once and skip all creates.
     - If the target path exists, record a failure naming the path.
     - Otherwise create the folder if needed, render the scaffold and write the file at the top level of the folder. Then write the managed properties last, so they win.
   - **One note**: write the managed properties (state `assigned`). If the title changed and the current basename equals the filename built from the previous `clickup-title` plus the ID, rename the note. If the new path is taken, keep the old name silently.
4. Dropped tasks are notes with state `assigned` whose ID isn't in the listing (skipping duplicates). Classify them one at a time with Get Task:
   - A 200 response rewrites all properties with the derived state (`closed` or `not-assigned`).
   - `OAUTH_027`, or any other non-200 except those in the next item, sets `gone` only.
   - 429, a network error or a bad token stops classification. The remaining notes stay `assigned`.
5. Notes in the `closed`, `not-assigned` and `gone` states are never fetched one by one.
6. Return the summary. The shell decides whether to show a notice (manual: always; interval: errors only, deduplicated until a success).

### Import

- Input parsing: trim, then take the last path segment of a URL (`/t/<id>` or `/t/<workspace>/<id>`). Reject input that doesn't look like an ID before making any request.
- Get Task. Then:
  - No note: create one as in refresh.
  - One note: update its managed properties and apply the rename rule.
  - Duplicates: show an inline error naming the paths.
- On success the shell opens the note. On failure the modal stays open with an inline message. The parent task isn't imported.

### Filename rule

- `<cleaned name> (<id>).md`. Cleaning removes `< > : " / \ | ? * # ^ [ ]` and control characters, collapses whitespace, trims spaces and dots from both ends, and caps the result at 100 characters. An empty cleaned name gives `(<id>).md`.
- No `aliases` are ever written.

### Scaffold rendering

- The token pattern is `{=ctc:<name>=}`. Known names are the nine property values (without the prefix) plus `description` (`markdown_description` verbatim), `space`, `folder`, `tags` (comma-separated), `assignees` (display names, comma-separated), `creator`, `created`, `start`, `today` (all dates `YYYY-MM-DD` local) and `raw` (the task JSON in a fenced `json` block).
- Unknown names are left as written. A known name with no value becomes an empty string.
- Frontmatter is parsed as YAML, and only string values are filled. The body is filled by text replacement.
- Default scaffold:
  - An **Open in ClickUp** link to `{=ctc:url=}`
  - The description placeholder
  - A `## Notes` heading

### Settings schema

`data.json` holds five values:

- `apiTokenSecret`: secret name, string
- `workspaceId`: string, blank by default
- `taskNoteFolder`: string, default `ClickUp`
- `scaffoldPath`: string, blank by default
- `refreshInterval`: `off` / `15m` / `30m` / `1h` / `4h`, default `off`

The existing `apiToken` field is removed and replaced by `apiTokenSecret`.

- The settings tab uses only `getSettingDefinitions()`, in three groups: **Connection**, **Task notes** and **Refresh**.
  - **API token** is a `render` row with `SecretComponent`.
  - **Test connection** is an action row.
  - Task note folder and scaffold note use `folder` and `file` controls with `validate`.
- Stored values are validated again when read, and an invalid folder counts as "not configured".
- The folder-moved notice fires once on `hide()`, only if the folder changed and the old folder held at least one task note.
- An interval change clears the old timer and registers a new one with `registerInterval`.

### Commands (stable IDs)

- `refresh-tasks`: **Refresh tasks**. Also on the ribbon, icon `refresh-cw`, tooltip "Refresh ClickUp tasks".
- `import-task`: **Import task by ID**.
- `insert-task-link`: **Insert link to task**. An `editorCallback`, with no default hotkey.

### Startup and readiness

- `onload` does no network or vault scanning. It registers the metadata-cache `resolved` listener, which sets the ready flag the first time it fires. The implementer should confirm the first `resolved` can't fire before `onload`; if it can, fall back to checking at `onLayoutReady`.
- When the interval is on, the first run comes after `onLayoutReady` plus about 30 s.

### Documentation

- The README covers:
  - the external service (ClickUp) and what is sent;
  - the token being stored per device and not synced;
  - notes having to stay inside the folder, and edits to `clickup-id` detaching a note;
  - the placeholder reference;
  - example `.base` files ("my open tasks" filtered on `clickup-state = assigned` and sorted by `clickup-due`, and "due today").

## Testing Decisions

- **One seam: the engine's public operations against a fake host.** Tests call `refresh`, `importTask`, `listAssignedTaskNotes` and `testConnection`. They use an in-memory fake host that serves canned ClickUp responses by URL (status, headers, JSON body) and holds an in-memory vault (files with text and frontmatter, with `processFrontMatter` and rename semantics). Assertions are made only on observable results: the returned summary or error, the files in the fake vault (paths, frontmatter and body text) and which requests were made. They never assert on internal module calls.
- **What makes a good test here.** Each test reads as a scenario, for example "a task renamed in ClickUp whose note the user also renamed keeps the user's filename but updates `clickup-title`". It sets up the vault and the ClickUp responses, runs one operation and checks the vault afterwards. Filename cleaning, placeholder rendering, date conversion and error classification are exercised through these scenarios, not tested directly.
- **Scenarios to cover at minimum:**
  - Listing: paging across `last_page` and the short-page fallback.
  - All-or-nothing: a failure on page 2 leaves the vault unchanged.
  - Each listing error (no token, `OAUTH_025`, offline, 429 with the wait computed from `X-RateLimit-Reset`, several workspaces, workspace not found).
  - Creating notes: the default scaffold, a custom scaffold with frontmatter placeholders including YAML-hostile values, a missing scaffold (no creates, but updates still happen), and a target path that's taken.
  - Renaming: rename versus keeping the user's name, and a rename collision.
  - Duplicates: they're skipped and counted.
  - Dropped tasks: classification to `closed`, `not-assigned` and `gone`. Classification stops on 429 or a network error, leaving the rest `assigned`. Notes that are already `closed`, `not-assigned` or `gone` aren't fetched. Reassignment returns a note to `assigned`.
  - Property writes: other frontmatter keys are kept, and deleted managed keys come back.
  - Edge cases: an empty cleaned name, and the 100-character cap.
  - Import: ID and URL forms, invalid input with no request made, an existing note updated rather than duplicated, colleague and closed tasks, and each inline error.
  - Picker data: only assigned notes, sorted by due date with undated notes last.
- **Tooling.** Add Vitest as a dev dependency with an `npm test` script, and add it to the CI lint workflow. Engine modules must not import `obsidian` at runtime (type-only imports are fine), so the tests need no Obsidian mocks.
- **Prior art.** None. This repo and the sibling plugins (`omdb-fetcher`, `osm-fetcher`) have no tests, so this sets the pattern.
- **Not covered by automated tests.** The Obsidian adapter, settings tab, modals, notices, ribbon and interval wiring are checked manually in the vault. There's also a **mobile acceptance check**: a refresh and an import must succeed on Android using `requestUrl` against api.clickup.com.

## Out of Scope

- Two-way sync, or any write to ClickUp.
- Multiple workspaces at once (one workspace per configuration).
- Bulk-importing closed tasks. Import is by ID only.
- ClickUp custom task IDs (`DEV-123`).
- Custom fields as placeholders or managed properties. `{=ctc:raw=}` is the only way to reach them.
- Configurable or user-renamable managed property names, aliases, and timestamp properties.
- A task view inside the plugin (example Bases files are shipped in the README instead).
- Inserting a link automatically after import.
- Detecting notes moved out of the folder, or edits to `clickup-id`.
- Downloading images or attachments from task descriptions.
- Integration with Templater or any other plugin.
- A status-bar item, progress notices, or automatic retry after rate limiting.
- Telling deleted tasks apart from inaccessible ones.

## Further Notes

- Unconfirmed API behaviour that's accepted as is: whether archived tasks are excluded from the listing, and how `done`-type statuses are handled (the workspace has none). Deleted and no-access tasks are assumed to return `OAUTH_027`.
- Known platform quirk: on mobile, secrets with the same name may be shared across vaults. Not handled, because there's a single user.
- Every later extension considered (custom-field placeholders, extra managed keys, "import and insert link") would add new names without changing existing ones, so v1 notes and scaffolds stay valid.
- Decision records: tickets 01–12 under `.scratch/v1-spec/issues/`, summarised in `.scratch/v1-spec/map.md`.
