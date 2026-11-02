---
title: "jord-F0025 — tables workspace v2 (Apolyx DataGrid + policy/API drawers)"
feature_id: jord-F0025
description: "Tables page on apolyx DataGrid: reorder/filter/edit-on-double-click, add column/row, per-table Policies and APIs drawers"
created: 2026-10-28
updated: 2026-10-28
tags:
  - feature
  - jord
  - todo
  - jord-F0025
  - studio
  - tables
  - datagrid
---

# jord-F0025 — tables workspace v2

> **Status:** todo · **Id:** `jord-F0025` · Index: [[../INDEX]] · Grid primitive: [[../../ui-kit/apolyx-F0008-datagrid|apolyx-F0008]]

## What

The Tables screen is rebuilt on the new Apolyx **DataGrid** and gains per-table operator actions. Each table opens in its own workspace **tab** ([[jord-F0023-studio-shell-v2|jord-F0023]]), so filters and scroll survive switching between tables.

### Grid

| Capability | Detail |
|------------|--------|
| Column header actions | Sort, filter, hide/show, pin left/right, resize, **drag to reorder**, reset view |
| Filtering | Filter builder with per-type operators (text contains, numeric range, date range, boolean, null/not-null, FK equals) + quick search |
| Cell edit | **Double-click** a cell to edit inline; typed editors per column type; Enter commits, ESC cancels |
| Hot sync | Optimistic update → write-queue ack reconciles the cell; realtime events merge into the grid without clobbering the cell being edited; failure rolls back with a toast |
| Rows | Insert row from the right inspector, duplicate, delete, multi-select + bulk delete, pagination / keyset fetch-more |
| Columns | Add column inline from the header or inspector (uses [[jord-F0024-column-model-v2|the column model]]) |
| Scale | Virtualized body; 10k rows without jank |
| Save views | Named view (filters + column order + widths) per table per project |
| Schema scope | Follows the sidebar **schema dropdown** ([[jord-F0023-studio-shell-v2\|jord-F0023]]): the grid, filters, and "new table" action target the selected schema; headers show the qualifier when it is not the default |

### Per-table actions

Two buttons on the Tables page (row action and table header) open the **right inspector** ([[jord-F0023-studio-shell-v2|shell v2]]):

1. **Policies** — list, create, edit, delete policies for this table; role scope, operation (select/insert/update/delete), row filter, preview of affected rows. Reuses [[../done/jord-F0008-policies|jord-F0008]].
2. **APIs** — what is available for this table and how to call it: generated CRUD routes, table API, custom/function endpoints that touch it, method + path + auth header + example `curl`/`fetch`, "try it" runner, and the realtime channel name. Reuses [[../done/jord-F0006-apis|jord-F0006]] + [[jord-F0017-table-api-v2|jord-F0017]] once it lands.

## Acceptance

1. 10k-row table scrolls smoothly; column reorder, filter, and saved view survive reload.
2. Double-click edit persists, shows the reconciled server value, and a rejected write restores the previous cell with a visible error.
3. A realtime change from another client updates the grid while an unrelated cell is being edited, without losing that edit.
4. Both drawers deep-link (`?inspector=policies`, `?inspector=apis`), and a saved policy is immediately reflected in the API drawer's example.
5. Switching the schema in the sidebar swaps the grid to that schema's table; creating a table there lands in the selected schema, not `public`.

## Overlap

| Id | Change |
|----|--------|
| [[../../ui-kit/apolyx-F0008-datagrid\|apolyx-F0008]] | The grid is built and owned by Apolyx; Studio only consumes it |
| [[../done/jord-F0012-studio\|jord-F0012]] | Replaces the current records/table screens; routes stay stable |
| [[jord-F0023-studio-shell-v2\|jord-F0023]] | Drawer mechanics come from the shell |
| [[../done/jord-F0009-realtime\|jord-F0009]] | Grid live merge uses the existing subscription stream |

## Out of scope

Spreadsheet formulas · CSV import wizard · cell-level audit history · collaborative multi-cursor editing.

## Plan tasks

| Task | Est. | Status |
|------|------|--------|
| [[../../../plan/Jord/phase-03/done/S0056-grid-column-ops\|S0056]] — grid column ops + views | 2.5–3 h | **done** 2026-11-02 |
| [[../../../plan/Jord/phase-03/done/S0057-row-ops-pagination\|S0057]] — row ops + paging | 2–3 h | **done** 2026-11-02 |
| [[../../../plan/Jord/phase-03/S0058-inline-edit-live-sync\|S0058]] — inline edit + live merge | 2.5–3 h | todo |
| [[../../../plan/Jord/phase-03/S0059-policies-apis-drawers\|S0059]] — policies + APIs drawers | 2.5–3 h | todo |

Queue: [[../../../plan/Jord/phase-03/README]].
