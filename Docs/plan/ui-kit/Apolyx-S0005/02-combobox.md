---
title: "Phase 2 — Combobox"
description: "Apolyx Combobox: searchable listbox, empty state, Studio Autocomplete recipes"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - ui-kit
  - apolyx
  - combobox
  - Apolyx-S0005
---

# Phase 2 — Combobox

> Who: apollo. Depends on Select listbox behavior from [[01-select]].

Sprint index: [[README]] · Intent: [[../../../feature_list/ui-kit/06-apolyx-s0005-product-gate]] · Reference: [Combobox](https://shadcnstudio.com/components) / Autocomplete kinds on Shadcn Studio

## Parts

| Part | Role |
|------|------|
| `Combobox` | Root. Value + open state; optional filter state |
| `ComboboxTrigger` / input surface | Opens panel; hosts filter text |
| `ComboboxContent` | Listbox panel |
| `ComboboxItem` | Option |
| `ComboboxEmpty` | No matches |

Reuse Select primitives where possible; do not fork a second floating stack.

## Behavior

- Local filter over item labels (case-insensitive)
- Keyboard matches Select + caret management in the filter field
- Empty state when filter matches nothing
- No free-form tag creation in this sprint

## Docs recipes

Compose 3–5 recipes mirroring Studio Combobox / Autocomplete layouts (search users, pick symbol, country stub without phone lib).

## Done when

- [ ] Registry `combobox` + Vitest filter / empty / keyboard
- [ ] Storybook + MDX recipes (polish OK in card 5)
