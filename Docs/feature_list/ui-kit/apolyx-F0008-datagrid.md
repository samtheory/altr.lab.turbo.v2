---
title: "apolyx-F0008 — DataGrid"
feature_id: apolyx-F0008
description: "Apolyx data grid primitive: column actions, virtualized rows, typed inline editing, optimistic + live sync hooks"
created: 2026-10-28
updated: 2026-11-02
tags:
  - feature
  - apolyx
  - ui-kit
  - datagrid
  - studio
---

# apolyx-F0008 — DataGrid

> **Status:** in progress · **Id:** `apolyx-F0008` · Index: [[INDEX]] · Consumer: [[../Jord/todo/jord-F0025-tables-workspace-v2|jord-F0025]] · Column-ops [[../../plan/Jord/phase-03/done/S0056-grid-column-ops|S0056]] · row select [[../../plan/Jord/phase-03/done/S0057-row-ops-pagination|S0057]] · **inline edit + external patch** [[../../plan/Jord/phase-03/done/S0058-inline-edit-live-sync|S0058]]

## What

A first-party grid for data-heavy products, built in `elements/ui-kit` with Apolyx primitives and tokens (no Radix/Base UI, no third-party grid engine). Jord Studio's tables, SQL results, and dashboard table blocks consume it.

| Area | Requirement |
|------|-------------|
| Columns | Declarative column defs (`id`, `header`, `type`, `width`, `min/max`, `sortable`, `filterable`, `editable`, `render`, `editor`); resize, pin left/right, hide/show, drag-reorder |
| Header actions | Sort cycle, filter popover with type-aware operators, column menu, reset view |
| Rows | Virtualized body, sticky header, row selection (single/multi), density, loading skeleton, empty + error states |
| Editing | Double-click (or Enter) to edit; typed editors — text, number, boolean, select, date, JSON; validation state; commit/cancel; controlled and uncontrolled modes |
| Sync hooks | `onCellCommit` returning a promise; pending cell state; revert on rejection; `applyExternalPatch` so realtime updates merge without disturbing the focused cell |
| Footer | Row count, optional aggregation per column |
| Accessibility | `role="grid"` with row/gridcell semantics, roving tabindex, arrow/Home/End navigation, announced sort/filter state, visible focus |
| Theming | Tokens only (default / power-blue / power-green × light/dark), no hard-coded colors |
| API | Controlled state (`columnOrder`, `filters`, `sort`, `selection`) + imperative scroll-to-row |

Deliverables: component + types exported from `@altr/apolyx`, stories for each state, unit tests for keyboard/a11y/editing, docs page in `apps/apolyx`, and a Storybook entry.

## Acceptance

1. 10k rows scroll without dropped frames; only visible rows are mounted.
2. Column reorder, filter, hide, and pin are keyboard-accessible and persist through the controlled state contract.
3. Editing commits through `onCellCommit`, shows a pending state, reverts on rejection, and does not lose an in-flight edit when an external patch arrives for another row.
4. Axe + keyboard checks pass in the Apolyx docs app; component appears in the kit's product-gate docs.

## Overlap

| Id | Change |
|----|--------|
| [[06-apolyx-s0005-product-gate\|apolyx-F0007]] | Product gate applies; this must ship with docs + tests like S0005 components |
| `elements/ui-kit/src/components/ui/table.tsx` | Static table stays for simple content; DataGrid is a separate, richer primitive |
| [[../Jord/done/jord-F0012-studio\|jord-F0012]] → [[../Jord/todo/jord-F0025-tables-workspace-v2\|jord-F0025]] | Studio's existing local tables are replaced by this primitive |

## Out of scope

Server-side data fetching/state store · spreadsheets (formulas, merged cells) · pivot/pivot-chart · virtualized columns beyond basic horizontal scroll.
