# 07: Insert link to task

**What to build:** While writing (e.g. in a daily note), I run **Insert link to task** and get a picker of my currently assigned task notes, soonest due first. I find the task by title, list or ID, and a link to its task note is inserted at the cursor in my vault's link format.

Spec: `.scratch/v1-spec/spec.md` (Engine operations → `listAssignedTaskNotes`, Commands); ticket `v1-spec/issues/11`.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Command id `insert-task-link`, an `editorCallback` with no default hotkey
- [ ] The engine's `listAssignedTaskNotes` returns only notes with `clickup-state: assigned` from the folder scan, with title, status, due, list and ID taken from the frontmatter, sorted by `clickup-due` ascending with undated notes last
- [ ] The `SuggestModal` matches on `clickup-title`, `clickup-list` and `clickup-id` (not the filename). Each entry shows the title and a second line of `status · due · list`
- [ ] Selecting an entry inserts `generateMarkdownLink(file, sourcePath)` at the cursor, with no alias
- [ ] With no assigned task notes, it shows "No assigned task notes. Run **Refresh tasks** first." instead of the modal
- [ ] Before the vault has finished indexing, it shows the same indexing message as refresh
- [ ] Engine tests cover filtering by state, sorting, and duplicate or non-task notes being excluded
