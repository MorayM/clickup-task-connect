# Map: ClickUp Task Connect v1

Label: wayfinder:map

## Destination

A v1 spec, ready to hand to an implementer, for a plugin that keeps one **task note** per ClickUp task assigned to the user. The plugin maintains **managed properties** one way (ClickUp → vault), so the notes can be linked from daily notes and other notes.

## Notes

- Domain: Obsidian community plugin (TypeScript, `minAppVersion` 1.13.0). Read `AGENTS.md` for platform rules and `CONTEXT.md` for the glossary. Use glossary terms (task note, managed property, body, scaffold, placeholder, refresh, import).
- Grilling sessions should also load domain-modeling and update `CONTEXT.md` inline.
- Reference implementations for the placeholder convention: the owner's sibling plugins `../omdb-fetcher` and `../osm-fetcher` (`{=omdb:…=}`, `{=osm:…=}`).
- Standing preferences: mobile-compatible (`requestUrl` only, `isDesktopOnly: false`); never delete or move user notes; keep startup light.
- When the frontier is empty, turn the map into `.scratch/v1-spec/spec.md` (to-spec skill).

## Decisions so far

- [Scope and shape of v1](issues/01-scope-and-shape.md): the scope is one workspace, open assigned tasks only, plus import by ID for closed tasks. The plugin owns frontmatter and the body is written once from a `{=ctc:…=}` scaffold. Notes live in one folder, filenames always include the task ID, and dropped tasks are kept and marked.
- [ClickUp API facts for fetching assigned tasks](issues/02-clickup-api-facts.md): use `GET /v2/user` and `GET /v2/team` for the IDs, then `GET /v2/team/{id}/task?assignees[]=…&subtasks=true&include_markdown_description=true`, paging by 100 with no documented `last_page`. The limit is 100 req/min (HTTP 429). A full listing each refresh is needed, because `date_updated_gt` can't see drop-outs. Closed and unassigned show up in Get Task (`status.type`, `assignees`), but deleted vs inaccessible is undocumented. `requestUrl` avoids CORS and nothing forces desktop-only.
- [Filename format and rename behaviour](issues/03-filename-format.md): `<name> (<id>).md` with the internal ID, and no aliases. The note is renamed (updating links) only if its filename is still the one the plugin generated. The name is stripped of characters that are illegal on any OS or that break wikilinks, and capped at 100 characters.
- [Import-by-ID command](issues/07-import-by-id.md): a modal takes a bare ID or task URL and creates the note (or updates the managed properties of an existing one), then opens it. It works for closed, unassigned and other people's tasks. Parents are not imported, and failures are shown inline in the modal.
- [Live API check of unconfirmed ClickUp behaviour](issues/08-live-api-check.md): the listing has `last_page`, and closed tasks are excluded by default. `priority` is always an object or null. There's no due-time flag; date-only dues sit at 04:00 local. A missing task returns 401 `OAUTH_027` (a bad token is `OAUTH_025`), so check `ECODE`. The rate-limit reset is in Unix seconds. The mobile check is deferred to an implementation acceptance test.
- [Managed property names and value formats](issues/04-managed-property-shape.md): there are nine fixed `clickup-*` properties (id, url, title, status, due, priority, list, parent, state). `due` is always a date, `priority` is its label, `list` is its name and `parent` is a bare ID. `clickup-state` is `assigned`, `closed`, `not-assigned` or `gone`. Empty values are written as null, writes go only through `processFrontMatter` and touch only these keys, and there are no extra properties in v1.
- [Placeholder set and default scaffold](issues/05-placeholders-and-default-scaffold.md): placeholder names have no prefix (`{=ctc:due=}`) and give the same values as the managed properties. The placeholder-only values are description (markdown, remote images), space, folder, tags, assignees, creator, created, start, today and raw. Unknown names are left as-is and empty values become an empty string. Frontmatter placeholders are filled in safely through YAML parsing, and managed properties win on a clash. The default scaffold is a ClickUp link, the description and `## Notes`. There's no integration with other plugins.
- [Refresh behaviour and dropped-task detection](issues/06-refresh-behaviour.md): refresh by a command and ribbon icon, with an optional interval (Off/15m/30m/1h/4h). When the interval is on, the first run is after layout plus about 30 s. Only one refresh runs at a time and extra triggers are skipped silently. Interval runs are silent on success. Every page is fetched before any write, so a failed listing changes nothing, and 429s aren't retried. Dropped `assigned` notes are classified one by one with Get Task, and an interruption leaves them `assigned` for next time. Notes in other states are never re-checked; re-import updates them.
- [Finding task notes by ID and handling duplicates](issues/09-finding-task-notes.md): each run scans only the task note folder (and its subfolders) by `clickup-id` through the metadata cache, with no persistent index. Notes moved out of the folder aren't seen (documented). For duplicate IDs the task is skipped and reported. If the filename is taken, a create is skipped as a failure and a rename is silently kept. Refresh and import wait for the first `resolved` event. IDs are matched as trimmed strings.
- [Custom fields in placeholders and properties](issues/10-custom-fields.md): custom fields aren't exposed in v1, either as placeholders or as managed properties. `{=ctc:raw=}` (which includes `custom_fields`) is the only way to reach them, and no setting is needed. Adding them later wouldn't break anything.
- [Daily-note linking helpers](issues/11-daily-note-helpers.md): **Insert link to task** is a picker that lists only `assigned` task notes. It matches on the title, list and ID from the frontmatter, shows status, due date and list, and inserts an unaliased `generateMarkdownLink`. Import doesn't insert links. There's no view in the plugin; instead the README includes an example `.base`. No settings are needed.
- [Settings surface and validation](issues/12-settings-surface.md): there are three groups. **Connection** has the API token (in Obsidian's secret storage, per device and not synced), an optional workspace ID (blank means the only one, and several is an error) and a **Test connection** action. **Task notes** has the folder (default `ClickUp`, root rejected, created on first write, notice shown when the tab closes) and the scaffold note (missing at create is a failure, never a fallback). **Refresh** has the interval, which applies straight away without an immediate run. Runs use a snapshot of the settings.

## Not yet specified

_Nothing. The frontier is empty; next step is turning the map into `spec.md`._

## Out of scope

- Two-way sync, and any write to ClickUp. The destination is one-way.
- Multiple workspaces: the user has a single workspace.
- Bulk-importing closed tasks: there would be hundreds, so import by ID only.
- ClickUp custom task IDs (`DEV-123`): the workspace doesn't use them.
