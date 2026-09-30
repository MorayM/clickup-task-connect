# Scope and shape of v1

Type: grilling
Status: resolved
Blocked by: none

## Question

What does v1 cover, and what is the basic shape of a task note and its lifecycle?

## Answer

Settled with the user while charting the map (2026-09-30):

- **Destination**: a v1 spec (not a single decision). One-way only: ClickUp → vault.
- **Task note identity**: one note per task, identified by the ClickUp task ID in frontmatter, not by title or path. Subtasks assigned to the user get their own notes.
- **Ownership**: the plugin owns a set of **managed properties** in frontmatter and rewrites them on every refresh. The **body** is written once from the **scaffold** and never touched again.
- **Linking**: plain `[[wikilinks]]` by note name; native backlinks give the reverse direction. Helpers are fog.
- **Which tasks**: tasks assigned to the user in their single workspace, open tasks only. Closed tasks are never fetched in bulk. A separate **import** creates a task note for any task by ID.
- **Refresh trigger**: a manual command, plus an optional interval (off by default). Any automatic refresh at startup must be deferred.
- **Dropped tasks** (closed, unassigned or deleted since the last refresh): keep the note and record the state in a managed property. Never delete or move it.
- **Placement**: one configurable folder. The filename **always** includes the task ID.
- **Managed property core set**: `clickup-id`, `url`, `title`, `status`, `due`, `priority`, `list`, `parent`. Custom fields are fog.
- **Scaffold**: the owner's existing placeholder convention, scoped to this plugin as `{=ctc:fieldName=}` (e.g. `{=ctc:clickup-id=}`). The description is only included via an explicit `{=ctc:description=}` placeholder.
- **Mobile**: supported. Use `requestUrl`, `isDesktopOnly: false`.

> Note (from "Placeholder set and default scaffold"): placeholder names drop the `clickup-` prefix, so the example is now `{=ctc:id=}`.
