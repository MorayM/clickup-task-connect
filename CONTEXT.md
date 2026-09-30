# ClickUp Task Connect

Connects a vault to the ClickUp tasks its owner is assigned to, so those tasks can be linked from other notes. Information flows one way: ClickUp → vault.

## Language

**Task note**:
A vault note that stands for exactly one ClickUp task, identified by that task's ID rather than its title or path. Renaming the task, or moving the note within the task note folder, doesn't change which task it stands for; there is never more than one task note per task. Subtasks assigned to the user get their own task notes. Only notes inside the task note folder (or its subfolders) count; a note moved elsewhere stops being a task note.
_Avoid_: task file, ClickUp note

**Duplicate**:
Two or more task notes claiming the same task ID, e.g. after the user copies a note. The plugin won't guess which one is real, so it leaves that task alone and reports it until the user removes the extras.
_Avoid_: conflict

**Managed property**:
A frontmatter property on a task note that the plugin owns and rewrites from ClickUp on every refresh. The user shouldn't edit it; edits are overwritten.
_Avoid_: synced field

**State**:
Where a task note's task stands relative to the user, kept separate from ClickUp's own status: **assigned** (open and assigned to the user), **closed** (closed in ClickUp; this wins over the others), **not-assigned** (open, but the user isn't an assignee, whether they were dropped or it was imported from a colleague) or **gone** (deleted or no longer visible; the two can't be told apart).
_Avoid_: status (that's ClickUp's own workflow status, mirrored as-is)

**Dropped task**:
A task whose task note had the state assigned but which no longer appears in a refresh. Its note is kept and its state is updated to closed, not-assigned or gone. After that, refreshes leave it alone unless the task becomes assigned to the user again or is imported again.

**Body**:
Everything in a task note outside the managed properties. Written once from the scaffold when the note is created, then owned entirely by the user and never touched by the plugin again.

**Scaffold**:
The template used to write a task note's initial body. Rendered once, at creation.
_Avoid_: task template (ambiguous with ClickUp's own task templates)

**Refresh**:
Fetching the user's assigned tasks from ClickUp, creating task notes for new ones, rewriting managed properties on existing ones and classifying dropped tasks. Only task notes in the assigned state, or whose task is in the listing, are touched. Never writes to ClickUp.
_Avoid_: sync (implies two-way)

**Placeholder**:
A token of the form `{=ctc:fieldName=}` in the scaffold, replaced with a value from the ClickUp task when the task note is created. The `ctc:` prefix scopes it to this plugin, matching the convention of the owner's other plugins (`{=omdb:…=}`, `{=osm:…=}`).

**Import**:
Creating a task note for one specific task, named by its ID, regardless of whether it is assigned to the user or open. Used for closed tasks, which a refresh never fetches.
