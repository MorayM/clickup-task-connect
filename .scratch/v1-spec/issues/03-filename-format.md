# Filename format and rename behaviour

Type: grilling
Status: resolved
Blocked by: none

## Question

Filenames always include the task ID. Decide:

- The exact format, e.g. `Fix login bug (86abc123).md`, `86abc123 Fix login bug.md` or `86abc123 - Fix login bug.md`. Consider how each reads in a `[[wikilink]]`, in link autocomplete, and in the file explorer's sort order.
- Whether an `aliases` managed property holds the bare task name so `[[Fix login bug` autocompletes, and whether that alias is kept current when the task is renamed.
- Sanitising characters that are illegal in filenames or wikilinks (`/ \ : * ? " < > | # ^ [ ] |`) and capping the length.
- Whether to use the ClickUp `custom_id` (e.g. `DEV-123`) when a workspace has custom task IDs enabled.
- What happens when a task is renamed in ClickUp: leave the filename alone and update only `title`/`aliases`, or rename via `FileManager.renameFile` (which updates links)? What if the user has renamed the note themselves?

## Answer

Settled with the user (2026-09-30):

- **Format**: `<name> (<id>).md`, e.g. `Fix login bug (86c1abcde).md`. `<id>` is always ClickUp's internal task ID. `custom_id` is not used (the workspace has no custom IDs).
- **Aliases**: none. The plugin never reads or writes `aliases`, and link autocomplete relies on the filename.
- **Renamed in ClickUp**: when a refresh sees a new name, it rebuilds the filename it would have generated from the *previous* `title` plus the ID. If the note's current basename matches that exactly, the plugin renames the note with `FileManager.renameFile` (which updates links). Otherwise the user has renamed the note, so the plugin leaves the filename alone. `title` is updated in both cases. No extra state is stored.
- **Cleaning the name part**: remove every character that is invalid on any of Linux, Windows, macOS or Android (`< > : " / \ | ? *` and control characters) and the characters that break wikilinks (`# ^ [ ]`). Collapse repeated whitespace, then trim leading and trailing spaces and dots. The unmodified name is kept in `title`.
- **Length**: cap the cleaned name at 100 characters. Never truncate the ID.
- **Empty after cleaning**: the filename is `(<id>).md`.

> Note (from "Managed property names and value formats"): the `title` property is now `clickup-title`.
