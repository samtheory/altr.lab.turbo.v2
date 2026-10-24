---
title: "Apolyx-S0005 — product gate"
description: "As-built: Select, Combobox, Pagination, Scroll Area, Progress, Accordion/Collapsible, Radio Group — Jord Studio / Artemis UI gate"
created: 2026-10-21
updated: 2026-10-21
tags:
  - tech-space
  - ui-kit
  - apolyx
  - Apolyx-S0005
  - select
  - combobox
---

# Apolyx-S0005 — product gate

> Who: implementers and reviewers. Code truth for sprint **Apolyx-S0005**. Intent: [[../../feature_list/ui-kit/06-apolyx-s0005-product-gate]] · Plan: [[../../plan/ui-kit/Apolyx-S0005/README]]. Roadmap: [[../../plan/00-roadmap-apolyx-jord-artemis]].

## What shipped

Seven registry UI items (plus Collapsible co-located in accordion), docs MDX + demos, Storybook where added, Vitest coverage. No Radix / Base UI. Floating panels reuse Portal → Presence → DismissableLayer → `useFloating` (same overlay family as Dropdown Menu / Popover).

| Count | After S0004 | After S0005 |
|-------|-------------|-------------|
| Registry items | 67 | **74** |
| Vitest tests | 149 | **163** |
| Docs MDX (new pages) | 49 | **+7** (select, combobox, pagination, scroll-area, progress, accordion, radio-group) |

### Components

| Item | Path | Notes |
|------|------|--------|
| Select | `src/components/ui/select.tsx` | Combobox role + listbox; typeahead; Field / ControlBox surface when nested in `Field`; labels cached after panel unmount for `SelectValue` |
| Combobox | `src/components/ui/combobox.tsx` | Searchable select; filter input; `ComboboxEmpty`; reuses `selectTriggerVariants` |
| Pagination | `src/components/ui/pagination.tsx` | Compositional chrome + `getPaginationRange` helper |
| Scroll Area | `src/components/ui/scroll-area.tsx` | CSS scrollport + thin token scrollbars |
| Progress | `src/components/ui/progress.tsx` | Determinate + indeterminate (`apolyx-progress-indeterminate` keyframe) |
| Accordion / Collapsible | `src/components/ui/accordion.tsx` | Single / multiple; height motion; Collapsible sibling API |
| Radio Group | `src/components/ui/radio-group.tsx` | Roving focus; hidden form value |

### Docs app

- Sidebar status `new` with purple **DocStatusBadge** (`apps/apolyx/src/components/site/doc-status-badge.tsx`) on S0005 entries and page titles.
- Forms group: Select, Combobox, Radio Group. Components: Accordion, Progress, Scroll Area. Navigation: Pagination.

### Policy (repo)

Always-on Cursor rule **Apolyx-first**: `.cursor/rules/apolyx-first.mdc` — product apps consume `@altr/apolyx`; missing controls are built with **apollo** + documented before app use. Noted in `AGENTS.md`.

## Not in this sprint

Slider, Command, data-grid engine, date / color pickers, phone input, dropdown submenus, candlestick, RHF / Zod adapter, remote registry / CLI update. See [[../../feature_list/ui-kit/01-apolyx-s0001-carryovers]].

## Verify

```bash
pnpm --filter @altr/apolyx test
pnpm --filter @altr/apolyx typecheck
pnpm --filter @altr/apolyx build
pnpm --filter @altr/apolyx-docs exec tsc --noEmit
```

Screenshots under `Docs/report/assets/apolyx-s0005/` were not captured at close (optional follow-up).

## Next

Implement **Jord-S0001** — [[../../plan/Jord/phase-01/Jord-S0001/README]] (start [[../../plan/Jord/phase-01/Jord-S0001/01-packages]]).
