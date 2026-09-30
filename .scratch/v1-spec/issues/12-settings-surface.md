# Settings surface and validation

Type: grilling
Status: resolved
Assignee: Moray Macdonald
Blocked by: 09

## Question

Settings use the declarative `getSettingDefinitions()` API (see `AGENTS.md`). Decide the full v1 settings list, defaults and validation:

- **API token**: a password-style field? Is it validated on entry (for example with `GET /v2/user`), and how is the result shown?
- **Workspace**: the user has one workspace, but a token can see several. Pick it automatically when there's only one, choose from a dropdown fetched with the token, or type the ID? What happens if the chosen workspace disappears?
- **Task note folder**: the default path, and whether the folder is created if it's missing. Already settled in "Finding task notes by ID and handling duplicates": only this folder and its subfolders are searched. Changing it shows a notice ("Existing task notes weren't moved. Move them into the new folder to keep them updated."), and the description should say notes must stay inside it to be updated.
- **Scaffold path**: an optional vault note used instead of the default scaffold. What happens when the path is empty, missing or unreadable?
- **Refresh interval**: the dropdown Off / 15 min / 30 min / 1 hour / 4 hours, default Off (from "Refresh behaviour and dropped-task detection"). Does changing it take effect immediately by re-registering the interval?
- "Daily-note linking helpers" and "Custom fields in placeholders and properties" both settled with no settings.

## Answer

Settled with the user (2026-09-30): **six settings in three groups, token in Obsidian's secret storage.** All of them use `getSettingDefinitions()`. Nothing else is added: interval runs stay silent on success, and there's no "Refresh now" button (the command and ribbon icon cover it).

**Connection**

- **API token**: a `render` row hosting `SecretComponent` (added with `addComponent`, because it needs `App`).
  - `data.json` stores only the secret's name (`apiTokenSecret`). The token is read when needed with `app.secretStorage.getSecret()`. Needs Obsidian 1.11.4+, which the existing `minAppVersion` 1.13.0 covers.
  - Per the [secret storage guide](https://docs.obsidian.md/plugins/guides/secret-storage), secrets are "stored in local storage, keyed to the specific vault". They don't sync, so the token is entered once on each device, while the secret's name does sync through `data.json`. The README should say so.
  - If no secret name is set, or this device has no secret with that name, it's treated as "no token", with the wording from "Refresh behaviour and dropped-task detection".
  - There's no check on entry, so no network call happens while the user types.
  - Known platform quirk (per [a forum report](https://forum.obsidian.md/t/secretstorage-appears-to-be-shared-across-vaults-on-mobile-but-vault-scoped-on-desktop/117793)): on mobile, secrets with the same name may be shared across vaults. It doesn't matter for a single user, so it isn't handled.
  - AGENTS.md's security line has been updated to match.
- **Workspace ID**: an optional `text` field, blank by default.
  - Blank means using the only workspace returned by `GET /v2/team`. If there are several, refresh and import fail with "Your token can see several workspaces. Set **Workspace ID** in settings."
  - If the ID is set but not returned, they fail with "Workspace <id> not found". This is a listing failure, so nothing changes.
- **Test connection**: an action row that calls `GET /v2/user` and `GET /v2/team`.
  - On success it shows "Connected as <username> to <workspace name>". If there are several workspaces and the ID is blank, it lists each name and ID instead.
  - On failure it uses the same wording as refresh (invalid token, offline, rate limited, no token).

**Task notes**

- **Task note folder**: a `folder` control, default `ClickUp`.
  - `validate` rejects an empty value or the vault root with "Choose a folder", because a root folder would mean scanning the whole vault on every run.
  - The folder isn't created when the setting changes; it's created on the first write if it's missing.
  - The notice "Existing task notes weren't moved. Move them into the new folder to keep them updated." appears once, when the settings tab is closed (`hide()`). It only appears if the folder differs from its value when the tab was opened and the old folder held at least one task note. Showing it on change could fire on every keystroke.
  - The description says notes must stay inside this folder (or its subfolders) to be updated.
- **Scaffold note**: a `file` control filtered to `.md`, blank by default. Blank means the default scaffold from "Placeholder set and default scaffold".
  - `validate` shows "Note not found" for a path that doesn't exist, but still saves the value (the note may be created later or arrive through sync).
  - If the path is set but the note is missing or unreadable when a task note is being created, that create fails. It never falls back to the default scaffold, because the body is only written once. Refresh still updates managed properties on existing notes, creates no new notes, and reports "Scaffold note not found: <path>". Import shows the same message inline and creates nothing.

**Refresh**

- **Refresh interval**: a `dropdown` with Off / 15 min / 30 min / 1 hour / 4 hours, default Off.
  - A change takes effect straight away: the current timer is cleared with `window.clearInterval` and a new one is registered with `registerInterval`, so it's still cleaned up on unload.
  - A change doesn't trigger an immediate refresh; the first run comes one full interval later. Off stops the timer.

**Cross-cutting**

- A refresh or import that's running keeps a snapshot of the settings from when it started. Changes apply from the next run.
- Stored values are validated again when read (the framework's `validate` doesn't fix invalid stored data). An invalid folder is treated as "not configured", and a manual refresh shows "Choose a task note folder in settings".
