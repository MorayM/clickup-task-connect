# Finding task notes by ID and handling duplicates

Type: grilling
Status: resolved
Assignee: Moray Macdonald
Blocked by: 04

## Question

Task notes are identified by `clickup-id` in frontmatter (see "Managed property names and value formats"). Decide:

- How the plugin finds the task note for a given ID: scan `metadataCache` frontmatter each refresh or import, or keep an in-memory index built lazily and updated on `metadataCache` `changed`/`deleted`/vault `rename` events? Does the search cover the whole vault or only the configured folder (the user may move notes out of it)?
- What happens when two notes claim the same `clickup-id` (e.g. the user duplicated a note): update both, update one (which one?), skip both and warn? How is the user told?
- What happens when a user edits or removes a note's `clickup-id`: the next refresh would create a new task note. Is that acceptable?
- Timing: `metadataCache` may not be resolved at startup. Must a refresh wait for `metadataCache` `resolved`?

## Answer

Settled with the user (2026-09-30):

- **Lookup**: at the start of each refresh or import, scan the task note folder (including subfolders) and read `clickup-id` from `metadataCache.getFileCache(f)?.frontmatter`. Build an ID → notes map that is thrown away after the run. There's no persistent index and there are no cache listeners for this.
- **Scope**: only the configured task note folder and its subfolders, never the whole vault, because the vault is large. Refresh, dropped-task detection and import's existing-note check all use this same scan. New notes are always created at the top level of the folder.
- **Notes moved out of the folder**: they're no longer seen. A still-assigned task gets a new note in the folder, and the moved note stays `assigned` and is never updated again. This is documented rather than detected: "Task notes must stay in this folder or its subfolders to be updated."
- **Folder setting changed**: existing notes aren't moved (the plugin never moves notes). Show a notice when the setting changes: "Existing task notes weren't moved. Move them into the new folder to keep them updated." The wording belongs to "Settings surface and validation".
- **Duplicates** (two or more notes in scope with the same `clickup-id`): skip that task completely, with no property writes, no rename, no dropped-task classification and no new note created. The manual refresh notice counts duplicates ("…, 1 duplicate"). Import shows an inline error naming the paths ("2 notes have this task ID: A, B"). Interval refreshes are silent about it.
- **Edited or removed `clickup-id`**: the note stops being a task note, and the next refresh may create a new one. This is documented, not detected.
- **Filename already taken**:
  - On create, if the target path exists (as any file), skip that task. Count it as a failure in the notice, naming the path. Never write into a file the plugin didn't create.
  - On rename (see "Filename format and rename behaviour"), keep the current filename and still update `clickup-title`. It isn't counted as a failure, and later refreshes won't retry it because the basename no longer matches the previous title.
- **Metadata cache readiness**: register `metadataCache.on('resolved')` in `onload` and set a ready flag the first time it fires. Until then:
  - a manual refresh shows "ClickUp: vault is still indexing, try again in a moment";
  - import shows the same message inline;
  - an interval refresh skips and waits for the next tick.
  
  The implementer should confirm the first `resolved` can't fire before `onload`. If it can, fall back to checking at `onLayoutReady`.
- **ID matching**: compare `String(value).trim()`, and always write `clickup-id` as a string. A note whose `clickup-id` is neither a string nor a number is not a task note.
