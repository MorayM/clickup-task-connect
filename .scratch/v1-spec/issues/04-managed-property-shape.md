# Managed property names and value formats

Type: grilling
Status: resolved
Assignee: Moray Macdonald
Blocked by: 02, 08

## Question

For the core managed properties (`clickup-id`, `url`, `title`, `status`, `due`, `priority`, `list`, `parent`), plus the dropped-task state marker, decide:

- The names: prefixed (`clickup-status`) to avoid clashing with the user's own properties, or bare? Should they be user-renamable?
- The value types, chosen for Bases/Dataview usefulness: `due` as a date or datetime? `priority` as a label (`urgent`) or a number? `list` as plain text? `parent` as a `[[wikilink]]` to the parent's task note (which may not exist)?
- How to represent the dropped-task state: a separate property (e.g. `clickup-state: active | closed | unassigned | deleted`) or folded into `status`? This depends on what the API can distinguish (research ticket 02).
- How to write frontmatter safely: `FileManager.processFrontMatter`, never touching properties the plugin doesn't own.
- Whether an empty value (e.g. no due date) deletes the property or sets it to null.

## Answer

Settled with the user (2026-09-30):

- **Names**: nine managed properties, all prefixed `clickup-` to avoid clashing with the user's own properties (property types are vault-wide in Obsidian). The names are fixed; users can't rename them in v1.

| Property | Value |
|---|---|
| `clickup-id` | Internal task ID (string) |
| `clickup-url` | The task's `url` |
| `clickup-title` | Task name, unmodified (the rename check reads its previous value) |
| `clickup-status` | ClickUp's `status.status` exactly as returned |
| `clickup-due` | Always a date, `YYYY-MM-DD` in local time. Any time of day is dropped (date-only dues arrive as 04:00 local) |
| `clickup-priority` | Label from `priority.priority`: `urgent`, `high`, `normal` or `low` |
| `clickup-list` | `list.name`, plain text |
| `clickup-parent` | Parent task ID as a bare string, never a link |
| `clickup-state` | `assigned`, `closed`, `not-assigned` or `gone` (see **State** in `CONTEXT.md`) |

- **`clickup-state`**: separate from `clickup-status`. `closed` (`status.type == "closed"`) wins over the others. `not-assigned` means the task is open but the user isn't in `assignees`, and covers both dropped tasks and imported colleagues' tasks. `gone` means Get Task returned `OAUTH_027` or another non-200 response other than a bad token or 429. Deleted and no-access tasks aren't told apart.
- **Empty values**: write null (`clickup-due:`), never remove the key, so every task note carries all nine keys. A value that becomes empty is cleared.
- **Writing**: always via `FileManager.processFrontMatter`, setting only the nine keys and never touching, removing or reordering other properties. A key the user deletes is added back on the next write. At creation, the managed properties are written after the scaffold is rendered, so they overwrite any key with the same name in the scaffold's frontmatter.
- **No extra properties in v1**: no `updated`/`refreshed` timestamps (they would change every note on every refresh), and no tags, assignees, space or folder (left in the custom-fields fog).
