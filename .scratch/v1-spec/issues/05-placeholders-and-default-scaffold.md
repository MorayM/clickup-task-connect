# Placeholder set and default scaffold

Type: grilling
Status: resolved
Assignee: Moray Macdonald
Blocked by: 02, 04

## Question

- Which `{=ctc:…=}` placeholders exist? Do they mirror the managed property names one-to-one (with the `clickup-` prefix, e.g. `{=ctc:clickup-status=}`, or without it, `{=ctc:status=}`), and which extra ones exist that are placeholder-only (`description`, `today`, `space`, `folder`, `assignees`…)?
- `{=ctc:description=}`: which ClickUp field (plain vs markdown description), and how are images and attachments handled?
- How are unknown placeholders and empty values rendered: left as-is, removed, or replaced with an empty string?
- Can placeholders appear in the scaffold's frontmatter, and how does that interact with the managed properties the plugin writes afterwards?
- What does the built-in default scaffold contain when no scaffold note is set in settings? Check the sibling plugins (`../omdb-fetcher`, `../osm-fetcher`) for consistency.

## Answer

Settled with the user (2026-09-30). The sibling plugins use the source API's field names, leave unknown or empty placeholders as-is, have a `raw` dump, and have no default scaffold (they fill a note that's already open). This plugin differs where the body is rendered only once.

- **Names**: no `clickup-` prefix (`ctc:` already scopes them). Each placeholder that mirrors a managed property gives exactly the property's value: `id`, `url`, `title`, `status`, `due` (`YYYY-MM-DD`), `priority` (label), `list`, `parent`, `state`. The `{=ctc:clickup-id=}` example in "Scope and shape of v1" is superseded by `{=ctc:id=}`.
- **Placeholder-only values**:
  - `description`: `markdown_description` verbatim. Images and attachments stay as remote links, and nothing is downloaded.
  - `space`, `folder`: the names.
  - `tags`: comma-separated.
  - `assignees`: display names, comma-separated.
  - `creator`: the creator's name.
  - `created` (`date_created`), `start` (`start_date`): `YYYY-MM-DD`, local time.
  - `today`: the note's creation date, `YYYY-MM-DD`.
  - `raw`: the task JSON in a fenced `json` code block.
- **Rendering**: an unknown name is left as-is, so typos are visible. A known name with no value becomes an empty string, because the body is never re-rendered.
- **Frontmatter**: placeholders are allowed in the scaffold's frontmatter. The plugin parses the frontmatter as YAML, fills in placeholders inside string values (never a raw text replacement, so values containing `:`, `#` or quotes can't break YAML) and writes via `processFrontMatter`. The managed properties are written last and win on a name clash. The body is filled in by plain text replacement.
- **Default scaffold** (when no scaffold note is set):

  ```markdown
  [Open in ClickUp]({=ctc:url=})

  {=ctc:description=}

  ## Notes

  ```

- **Independence**: only `{=ctc:…=}` is rendered, and everything else is copied verbatim. There's no integration with or awareness of Templater or any other plugin.
