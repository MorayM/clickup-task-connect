# 09: README and example Bases

**What to build:** The README tells a new user what the plugin does, what it sends to ClickUp, how to set it up on each device, the rules task notes live by, and every placeholder. It includes ready-to-use Bases for "my open tasks" and "due today".

Spec: `.scratch/v1-spec/spec.md` (Documentation).

**Blocked by:** 04, 05, 06, 07, 08

**Status:** ready-for-agent

- [ ] Discloses the external service (ClickUp API), what is requested, that nothing is written to ClickUp, and that requests are made only when the user asks or has enabled the interval
- [ ] Explains that the token lives in Obsidian's secret storage per device and must be entered on each device. The secret's name syncs
- [ ] Explains that task notes must stay inside the task note folder (or its subfolders) to be updated, and that editing `clickup-id` detaches a note
- [ ] Documents the nine managed properties, the four states, the body/scaffold rule and the full placeholder reference, including `raw` as the way to reach custom fields
- [ ] Documents the commands: **Refresh tasks**, **Import task by ID**, **Insert link to task**
- [ ] Includes an example `.base` filtering `clickup-state = assigned` sorted by `clickup-due`, and a "due today" variant. Both are checked to open in Obsidian
- [ ] Follows the style rules in AGENTS.md (sentence case, bold UI labels, arrow navigation)
