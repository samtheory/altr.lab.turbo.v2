---
title: "plan/ui-kit — Apolyx-S0005 sprint"
description: "Sprint Apolyx-S0005: Select, Combobox, Pagination, Accordion, Scroll Area, Progress, Radio Group — product gate for Jord Studio and Artemis"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - ui-kit
  - apolyx
  - sprint
  - Apolyx-S0005
  - readme
---

# plan / ui-kit — Apolyx-S0005

> Who: **apollo** executes cards; **docs_man** closes the sprint. Intent: [[../../../feature_list/ui-kit/06-apolyx-s0005-product-gate]]. Previous: [[../Apolyx-S0004/README]]. Roadmap: [[../../00-roadmap-apolyx-jord-artemis]].

**Sprint id:** `Apolyx-S0005`  
**Status:** closed — 2026-10-21 · **Owner:** apollo · **Docs steward:** docs_man

## Goal

Ship the **product gate** components so Jord Studio S1 and an Artemis shell can compose filters, dense panels, and form controls without inventing one-off listboxes. Reference look: [Shadcn Studio Components](https://shadcnstudio.com/components). Implementation: Apolyx-owned primitives only.

## Phases

| # | Card | Delivers | Status |
|---|------|----------|--------|
| 1 | [[01-select]] | Select listbox parts, Field wiring, keyboard + typeahead | done |
| 2 | [[02-combobox]] | Combobox / searchable select + empty state + recipes | done |
| 3 | [[03-data-chrome]] | Pagination, Scroll Area, Progress | done |
| 4 | [[04-accordion-radio]] | Accordion (+ Collapsible if needed), Radio Group | done |
| 5 | [[05-docs-registry-verify]] | MDX, exports, registry, tests, typecheck | done |
| 6 | [[06-docs-man-handoff]] | feature_list ticks + tech_space + report + brain | done |

## Plan-level decisions

1. **No Radix / Base UI.** Select and Combobox use Portal + Presence + DismissableLayer + FocusScope + `useFloating` + a listbox / roving-focus pattern (extend existing primitives).
2. **Select ≠ Dropdown Menu.** Dropdown Menu is actions; Select is a value listbox. Do not merge APIs.
3. **Combobox is one component.** Studio Autocomplete variants are docs recipes, not a second package.
4. **Pagination is chrome only.** No fetch / URL sync library inside the kit.
5. **Scroll Area is owned.** Prefer CSS scrollport + token scrollbar; avoid shipping a third-party scroll library.
6. **Progress covers determinate + indeterminate.** Popover download recipes can migrate later; not required in this sprint.
7. **Accordion before Collapsible.** Prefer Accordion for multi-section; add Collapsible only if a single disclosure cannot reuse Accordion item parts.
8. **Out of sprint:** Slider, Command, data-grid engine, date pickers, phone input, submenus, candlestick, RHF/Zod adapter.

## Counts at close

| What | After S0004 | After S0005 |
|------|-------------|-------------|
| Registry items | 67 | **74** |
| Vitest tests | 149 | **163** |

## Definition of done (sprint)

- [x] Every card's "Done when" holds.
- [x] `pnpm --filter @altr/apolyx test`, `typecheck`, `build` (registry) green; `tsc` clean in `apps/apolyx`.
- [ ] Light and dark screenshots under `Docs/report/assets/apolyx-s0005/` (optional follow-up; not blocking close).
- [x] docs_man handoff done (card 6). As-built: [[../../../tech_space/ui-kit/10-s0005-product-gate]].

**Next:** [[../../Jord/Jord-S0001/README]].

## Links

- Track index: [[../README]]
- Intent: [[../../../feature_list/ui-kit/06-apolyx-s0005-product-gate]]
- As-built: [[../../../tech_space/ui-kit/10-s0005-product-gate]]
- Carry-overs: [[../../../feature_list/ui-kit/01-apolyx-s0001-carryovers]]
- Builder: [[../../../agents/apollo/00-index]]
- Reference: https://shadcnstudio.com/components
