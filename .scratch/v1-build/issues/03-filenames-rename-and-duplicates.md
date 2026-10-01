# 03: Filenames, rename rule and duplicates

**What to build:** Task note filenames are safe on every OS and in wikilinks. When a task is renamed in ClickUp, its note is renamed too (with links updated), unless I renamed the note myself. Filename collisions never overwrite anything. If two notes claim the same task ID (a **duplicate**), the plugin leaves that task alone and tells me.

Spec: `.scratch/v1-spec/spec.md` (Filename rule, Refresh algorithm step 3); tickets `v1-spec/issues/03` and `09`.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] The name part has `< > : " / \ | ? * # ^ [ ]` and control characters removed, whitespace collapsed, spaces and dots trimmed from both ends, and is capped at 100 characters. The ID is never truncated. An empty name gives `(<id>).md`. `clickup-title` keeps the name unmodified
- [ ] When the title changes and the note's basename equals the filename built from the previous `clickup-title` plus the ID, the note is renamed via the host's link-updating rename and counted as renamed
- [ ] When the basename differs (the user renamed it), the filename is kept and only `clickup-title` is updated
- [ ] If the rename target exists, the current name is kept silently and it isn't counted as a failure
- [ ] If a create's target path exists as any file, that task is skipped and counted as a failure naming the path. The existing file is never written to
- [ ] A task whose ID appears on two or more notes in scope gets no property writes, no rename and no new note. It's counted as a duplicate in the manual summary ("…, 1 duplicate")
- [ ] No `aliases` are ever written
- [ ] Engine tests cover each of the above scenarios
