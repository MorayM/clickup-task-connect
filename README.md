# ClickUp Task Connect

An [Obsidian](https://obsidian.md) plugin that connects your notes to [ClickUp](https://clickup.com) tasks.

The plugin keeps one **task note** per ClickUp task assigned to you, in one folder of your vault. Each task note has a fixed set of properties (status, due date, priority and so on) that the plugin keeps up to date from ClickUp. The rest of the note is yours: write in it, link to it from daily notes and meeting notes, and build Bases views over the properties.

Data only flows one way, from ClickUp to your vault. The plugin never changes anything in ClickUp.

## Requirements

- Obsidian 1.13.0 or later, on desktop or mobile.
- A ClickUp personal API token (**ClickUp → Settings → Apps**).

## Privacy and network use

- The plugin talks to one external service: the ClickUp API (`api.clickup.com`). No other services are used and no telemetry is collected.
- It sends your API token to ClickUp, and nothing else from your vault. It requests your user, your workspaces, the open tasks assigned to you and, when needed, single tasks by ID.
- Nothing is ever written to ClickUp.
- Requests are made only when you ask (**Refresh tasks**, **Import task by ID**, **Test connection**), or on a timer if you turn on **Refresh interval**. With the interval off (the default), the plugin is offline until you use it.
- Nothing is downloaded from task descriptions: images stay as links to ClickUp.

## Setup

1. Install and enable the plugin, then open **Settings → ClickUp Task Connect**.
2. Under **API token**, create a secret holding your ClickUp personal API token.
3. If your token can see more than one workspace, enter the **Workspace ID** you want. Select **Test connection** to see who you're connected as, or to list your workspaces and their IDs.
4. Optionally change the **Task note folder** (default `ClickUp`) and pick a **Scaffold note**.
5. Run **Refresh tasks** from the command palette or the ribbon icon.

### The token is stored per device

The token is kept in Obsidian's secret storage, which is local to each device and doesn't sync. Only the secret's *name* is saved in the plugin's `data.json`, so it syncs to your other devices, but you need to enter the token once on each device you use.

## Commands

| Command | What it does |
|---|---|
| **Refresh tasks** | Creates task notes for newly assigned tasks and updates existing ones. Also on the ribbon. |
| **Import task by ID** | Creates or updates the task note for any task, by ID or by pasting its ClickUp link, then opens it. Works for closed tasks and colleagues' tasks, which a refresh never fetches. |
| **Insert link to task** | Picks one of your assigned task notes (soonest due first) and inserts a link to it at the cursor, in your vault's link format. |

A manual refresh ends with a summary notice, such as "ClickUp: 2 new, 1 renamed, 1 no longer assigned" or "ClickUp: up to date". Interval refreshes are silent unless something goes wrong, and each error is shown once until a refresh succeeds again.

## How task notes work

### Where they live

Task notes are created at the top level of the task note folder, named `<task name> (<task ID>).md`. You can move them into subfolders of that folder and rename them freely: the plugin finds them by their `clickup-id` property, not by name or path.

- **Keep task notes inside the task note folder** (or its subfolders). A note moved outside it is no longer updated, and a refresh would create a new note for the task.
- **Don't edit `clickup-id`.** Changing it detaches the note from its task.
- If two notes have the same `clickup-id`, the plugin leaves that task alone and reports it as a duplicate until you remove one.
- If you change the task note folder, existing notes aren't moved. Move them yourself to keep them updated.

### Managed properties

Every task note has these nine properties. The plugin rewrites them on every refresh and never touches any other property. If you delete one, it comes back on the next refresh. Empty values are written as empty (null), not removed.

| Property | Value |
|---|---|
| `clickup-id` | The task's ID |
| `clickup-url` | Link to the task in ClickUp |
| `clickup-title` | The task name, exactly as in ClickUp |
| `clickup-status` | The task's status, as named in ClickUp |
| `clickup-due` | Due date as `YYYY-MM-DD` in your time zone |
| `clickup-priority` | `urgent`, `high`, `normal` or `low` |
| `clickup-list` | The name of the task's list |
| `clickup-parent` | The parent task's ID, for subtasks |
| `clickup-state` | `assigned`, `closed`, `not-assigned` or `gone` (see below) |

### States

`clickup-state` records the task's relationship to you. It's separate from `clickup-status`, so you can filter on either.

| State | Meaning |
|---|---|
| `assigned` | Open and assigned to you |
| `closed` | Closed in ClickUp. This wins if the task is also no longer yours. |
| `not-assigned` | Open, but no longer assigned to you (or a colleague's task you imported) |
| `gone` | Deleted, or you can no longer access it. The other properties keep their last known values. |

Task notes are never deleted. When a task leaves your assigned list, its note is checked once and marked `closed`, `not-assigned` or `gone`. After that it isn't checked again, unless the task is assigned to you again, which puts it back to `assigned`.

### Renaming

When a task is renamed in ClickUp, its note is renamed to match and links to it are updated. If you've renamed the note yourself, your filename is kept and only `clickup-title` changes. If the new name is already taken, the old name is kept.

### The note body

The body is written once, when the note is created, from the **scaffold**. After that it's yours: refreshes never change it.

Without a scaffold note, new task notes start with:

```markdown
[Open in ClickUp]({=ctc:url=})

{=ctc:description=}

## Notes
```

To use your own layout, set **Scaffold note** to any note in your vault. If that note is missing when a task note would be created, no new notes are created (existing ones are still updated) until it's back.

## Placeholder reference

Placeholders are written `{=ctc:name=}` and work in the scaffold's body and in its frontmatter values. In frontmatter they're filled in safely, so titles containing `:`, `#` or quotes don't break your properties. If the scaffold's frontmatter has a property with the same name as a managed property, the managed property wins.

An unknown name is left as written, so typos are easy to spot. A known name with no value becomes empty. Anything else, such as Templater syntax, is copied unchanged.

| Placeholder | Value |
|---|---|
| `{=ctc:id=}` | Same as `clickup-id` |
| `{=ctc:url=}` | Same as `clickup-url` |
| `{=ctc:title=}` | Same as `clickup-title` |
| `{=ctc:status=}` | Same as `clickup-status` |
| `{=ctc:due=}` | Same as `clickup-due` |
| `{=ctc:priority=}` | Same as `clickup-priority` |
| `{=ctc:list=}` | Same as `clickup-list` |
| `{=ctc:parent=}` | Same as `clickup-parent` |
| `{=ctc:state=}` | Same as `clickup-state` |
| `{=ctc:description=}` | The task description, as Markdown. Images stay as links to ClickUp. |
| `{=ctc:space=}` | The space name, when ClickUp includes it |
| `{=ctc:folder=}` | The folder name (empty for lists directly in a space) |
| `{=ctc:tags=}` | Tag names, comma-separated |
| `{=ctc:assignees=}` | Assignees' names, comma-separated |
| `{=ctc:creator=}` | The creator's name |
| `{=ctc:created=}` | Date the task was created, `YYYY-MM-DD` |
| `{=ctc:start=}` | Start date, `YYYY-MM-DD` |
| `{=ctc:today=}` | Date the note was created, `YYYY-MM-DD` |
| `{=ctc:raw=}` | The full task as JSON in a code block. Use this to reach custom fields and anything else not listed here. |

## Example Bases

Save these as `.base` files anywhere in your vault. Change `"ClickUp"` if you use a different task note folder. Both are also in the [`examples`](examples) folder.

**My open tasks**, soonest due first:

```yaml
filters:
  and:
    - file.inFolder("ClickUp")
    - 'note["clickup-state"] == "assigned"'
views:
  - type: table
    name: My open tasks
    order:
      - file.name
      - clickup-status
      - clickup-due
      - clickup-priority
      - clickup-list
    sort:
      - property: clickup-due
        direction: ASC
```

**Due today**:

```yaml
filters:
  and:
    - file.inFolder("ClickUp")
    - 'note["clickup-state"] == "assigned"'
    - 'date(note["clickup-due"]) == today()'
views:
  - type: table
    name: Due today
    order:
      - file.name
      - clickup-status
      - clickup-priority
      - clickup-list
    sort:
      - property: file.name
        direction: ASC
```

## Development

Requires Node.js (current LTS).

```bash
npm install     # install dependencies
npm run dev     # compile src/main.ts → main.js in watch mode
npm run build   # type-check and produce a production build
npm run lint    # run ESLint with eslint-plugin-obsidianmd
npm test        # run the engine tests with Vitest
```

All behaviour lives in a task-note engine (`src/engine/`) that doesn't import Obsidian at runtime. It talks to Obsidian and ClickUp through a single host port, which the tests replace with an in-memory fake (`test/fake-host.ts`).

The repository lives at `<Vault>/.obsidian/plugins/clickup-task-connect/`, so after a build you can reload Obsidian (or toggle the plugin in **Settings → Community plugins**) to pick up changes.

See [AGENTS.md](AGENTS.md) for project conventions.

## Releasing

1. Update `minAppVersion` in `manifest.json` if needed.
2. Run `npm version patch|minor|major`. This bumps `package.json` and `manifest.json` and adds the entry to `versions.json`.
3. Push the commit and tag (`git push --follow-tags`). The release workflow builds the plugin and creates a draft GitHub release with `main.js`, `manifest.json` and `styles.css`.
4. Review and publish the draft release.

## Manual installation

Copy `main.js`, `styles.css` and `manifest.json` into `<Vault>/.obsidian/plugins/clickup-task-connect/`.

## License

[0BSD](LICENSE)
