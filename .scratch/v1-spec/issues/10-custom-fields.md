# Custom fields in placeholders and properties

Type: grilling
Status: resolved
Assignee: Moray Macdonald
Blocked by: 04, 05

## Question

The managed property set is fixed at nine `clickup-*` keys, and the placeholders are fixed too (see "Managed property names and value formats" and "Placeholder set and default scaffold"). Decide whether v1 exposes ClickUp custom fields at all:

- As placeholders only, e.g. `{=ctc:cf:<field name>=}`, matched by name or by field ID? How is each custom field type (dropdown, labels, date, number, users, checkbox, URL) turned into text?
- As managed properties too, meaning user-configured extra `clickup-*` keys that are rewritten on every refresh? That would make the property set configurable.
- Or neither in v1, with `{=ctc:raw=}` as the escape hatch.

## Answer

Settled with the user (2026-09-30): **neither in v1.**

- No custom-field placeholders and no custom-field managed properties. The managed property set stays the fixed nine keys, and the placeholder set stays as settled in "Placeholder set and default scaffold".
- Custom fields reach a task note only through `{=ctc:raw=}`, since the task JSON includes `custom_fields` (confirmed in "Live API check of unconfirmed ClickUp behaviour").
- No settings are needed for custom fields.
- Adding either one later is non-breaking: `{=ctc:cf:…=}` placeholders or configurable extra `clickup-*` keys would both be new names, so existing scaffolds and notes keep working.
