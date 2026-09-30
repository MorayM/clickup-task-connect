# ClickUp Task Connect

An [Obsidian](https://obsidian.md) plugin that connects your notes to [ClickUp](https://clickup.com) tasks.

> Early development: the plugin currently only provides a settings tab for your ClickUp API token.

## Requirements

- Obsidian 1.13.0 or later.
- A ClickUp personal API token (**ClickUp → Settings → Apps**).

## Privacy and network use

This plugin talks to the ClickUp API (`api.clickup.com`) using the API token you provide. The token is stored locally in the plugin's `data.json` inside your vault and is only sent to ClickUp. No other external services are used and no telemetry is collected.

## Development

Requires Node.js (current LTS).

```bash
npm install     # install dependencies
npm run dev     # compile src/main.ts → main.js in watch mode
npm run build   # type-check and produce a production build
npm run lint    # run ESLint with eslint-plugin-obsidianmd
```

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
