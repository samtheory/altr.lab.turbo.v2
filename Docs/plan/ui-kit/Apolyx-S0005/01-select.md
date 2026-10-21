---
title: "Phase 1 — Select"
description: "Apolyx Select listbox: parts, keyboard, typeahead, Field integration"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - ui-kit
  - apolyx
  - select
  - Apolyx-S0005
---

# Phase 1 — Select

> Who: apollo. Combobox (card 2) builds on this listbox contract.

Sprint index: [[README]] · Intent: [[../../../feature_list/ui-kit/06-apolyx-s0005-product-gate]] · Neighbors: `dropdown-menu.tsx`, `popover.tsx`, `roving-focus`

Follow the WAI-ARIA **listbox** pattern (combobox pattern waits for card 2).

## Parts

| Part | Role |
|------|------|
| `Select` | Root. `value` / `defaultValue` / `onValueChange`. `disabled`, `name` optional |
| `SelectTrigger` | Button. Shows `SelectValue`. `asChild` via Slot |
| `SelectValue` | Placeholder when empty; mirrors selected item label |
| `SelectContent` | Portaled listbox panel |
| `SelectItem` | Option. `value`, `disabled` |
| `SelectGroup` / `SelectLabel` / `SelectSeparator` | Grouping |

## Behavior

- Arrow keys move highlight; Enter / Space commit; Esc closes; typeahead matches labels
- Focus returns to trigger on close
- Works inside `Field` / Dialog / Popover (top dismiss layer only)
- Semantic tokens only; no hard-coded Studio colors

## Done when

- [ ] Public exports + registry `select`
- [ ] Vitest covers keyboard select, disabled item, controlled value
- [ ] Storybook stories for sizes / groups / Field
- [ ] MDX page draft (can finish polish in card 5)
