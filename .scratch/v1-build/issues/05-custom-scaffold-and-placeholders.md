# 05: Custom scaffold and placeholders

**What to build:** I can point the plugin at a **scaffold** note of my own. New task notes are rendered from it, with `{=ctc:…=}` **placeholders** filled in from the task, in both the body and the frontmatter. A missing scaffold note never produces a note with the wrong body.

Spec: `.scratch/v1-spec/spec.md` (Scaffold rendering, Settings schema → Scaffold note, Refresh algorithm step 3); ticket `v1-spec/issues/05`.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] **Scaffold note** setting: a `file` control filtered to `.md`, blank by default (blank means the default scaffold). `validate` shows "Note not found" for a missing path but still saves it
- [ ] Placeholders for the nine property values (`id`, `url`, `title`, `status`, `due`, `priority`, `list`, `parent`, `state`) give exactly the managed property's value
- [ ] Placeholder-only values: `description` (`markdown_description` verbatim, images left as remote links), `space`, `folder`, `tags` (comma-separated), `assignees` (display names, comma-separated), `creator`, `created`, `start`, `today` (dates as local `YYYY-MM-DD`) and `raw` (task JSON in a fenced `json` block)
- [ ] Unknown placeholder names are left as written. Known names with no value become an empty string
- [ ] Scaffold frontmatter is parsed as YAML, and placeholders are filled only inside string values (values containing `:`, `#` or quotes stay valid YAML). Managed properties are written last and win on a name clash
- [ ] Anything that isn't a `{=ctc:…=}` token (e.g. Templater syntax) is copied as-is
- [ ] If the scaffold path is set but the note is missing or unreadable, a refresh creates no notes, still updates existing ones, and reports "Scaffold note not found: <path>" once
- [ ] Engine tests cover body and frontmatter rendering, YAML-hostile values, unknown and empty placeholders, the clash rule, and the missing scaffold
