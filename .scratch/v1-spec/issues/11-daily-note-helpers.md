# Daily-note linking helpers

Type: grilling
Status: resolved
Assignee: Moray Macdonald
Blocked by: 03, 04

## Question

Filenames are `<name> (<id>).md` and properties are settled. Beyond typing plain `[[wikilinks]]`, which helpers (if any) does v1 ship?

- A command such as **Insert link to task**, with a fuzzy picker over task notes (all of them, or only those with `clickup-state: assigned`?) that inserts `[[<note>]]` at the cursor.
- Inserting a link at the cursor after **Import task by ID** (which was deferred to here).
- A "due today" or "my open tasks" view. Or is that left to Bases/Dataview over the `clickup-*` properties, perhaps with a documented example Base in the README?

## Answer

Settled with the user (2026-09-30): **one picker command, no import-time linking, no view.**

- **Insert link to task** (id `insert-task-link`, no default hotkey) is an `editorCallback` command, so it's only available in a markdown editor.
  - Like refresh and import, it waits for the first metadata-cache `resolved` event (see "Finding task notes by ID and handling duplicates").
  - It opens a `SuggestModal` over task notes with `clickup-state: assigned` only. Closed, `not-assigned` and `gone` notes are linked with Obsidian's normal `[[` autocomplete, which finds them easily because the ID is in the filename.
  - It matches on `clickup-title`, `clickup-list` and `clickup-id` from the frontmatter, not the filename, so it still works after the user renames a note.
  - Each entry shows the title, then a second line of `status · due · list`. With an empty query, entries are sorted by `clickup-due` ascending, with tasks that have no due date last.
  - Selecting an entry inserts `app.fileManager.generateMarkdownLink(file, sourcePath)` at the cursor, with no alias. This follows the vault's settings for link format and path style, and matches the "no aliases" filename decision.
  - If there are no assigned task notes, it shows the notice "No assigned task notes. Run **Refresh tasks** first." instead of an empty modal.
- **Import task by ID** does not insert a link. It stays as settled in "Import-by-ID command". A separate "import and insert link" command could be added later without breaking anything.
- **No view in the plugin.** The README ships an example `.base` that filters `clickup-state = assigned` and sorts by `clickup-due`, plus a "due today" variant. The fixed, typed managed properties are what make this work.
- **No settings.** Nothing is added to "Settings surface and validation".
