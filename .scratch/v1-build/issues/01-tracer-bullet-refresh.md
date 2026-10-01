# 01: Tracer bullet: refresh creates and updates task notes

**What to build:** Running **Refresh tasks** (command or ribbon icon) fetches the open tasks assigned to me in my workspace and creates one **task note** per task in the task note folder. Each note's **body** comes from the default **scaffold** and it has all nine **managed properties**. Running it again finds the existing notes by `clickup-id` (including in subfolders) and rewrites their managed properties without touching the body or any other frontmatter key. A notice summarises what happened. This ticket also sets up the engine + fake-host test seam that every later ticket builds on.

Spec: `.scratch/v1-spec/spec.md` (Architecture, Managed properties, Refresh algorithm steps 2–3, Settings schema, Testing Decisions).

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Vitest is a dev dependency with an `npm test` script, and CI runs it alongside lint
- [x] The task-note engine exposes `refresh` and depends only on a single host port (ClickUp HTTP + vault operations). Engine modules have no runtime `obsidian` import
- [x] An in-memory fake host (canned ClickUp responses by URL, an in-memory vault with `processFrontMatter` and rename semantics) drives the engine tests
- [x] The Obsidian adapter implements the host port with `requestUrl` (`throw: false`), `processFrontMatter`, `FileManager.renameFile` and the metadata cache
- [x] Settings: **API token** via `SecretComponent` (`data.json` stores `apiTokenSecret` only; the old `apiToken` field is removed), **Workspace ID** (blank means the only workspace) and **Task note folder** (default `ClickUp`, rejects empty and root, checked again on read), all via `getSettingDefinitions()`
- [x] **Refresh tasks** command (id `refresh-tasks`) and ribbon icon (`refresh-cw`, "Refresh ClickUp tasks")
- [x] The refresh resolves the user and workspace, fetches a single page of assigned tasks, and creates missing task notes at the top level of the folder (creating the folder if needed) using `<name> (<id>).md` and the default scaffold
- [x] All nine `clickup-*` keys are written with the specified formats (`clickup-due` local `YYYY-MM-DD`, priority label, list name, bare parent ID, state `assigned`). Empty values are null. Managed properties are written after the scaffold, so they win
- [x] A second refresh updates existing notes found by `String(clickup-id).trim()` in the folder and its subfolders, without changing the body or non-managed keys, and restores any managed key the user deleted
- [x] A manual refresh shows a summary notice with counts of new and updated notes
- [x] Engine tests cover: first refresh creates notes, second refresh updates them in place, user frontmatter is preserved, and a deleted managed key is restored

## Comments

- New task notes are written in a single `createFile` call with the frontmatter (scaffold keys, then managed properties) already in place, rather than create-then-`processFrontMatter`. A failed second step could otherwise leave a note without `clickup-id`, blocking that task's filename forever. The host port gained `stringifyYaml` for this. Updates to existing notes still go through `processFrontMatter`.
