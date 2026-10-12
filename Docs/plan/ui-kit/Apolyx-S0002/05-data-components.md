---
title: "Phase 5 — data components"
description: "Table, List, Grid — presentational data display with semantic HTML"
created: 2026-10-11
updated: 2026-10-11
tags:
  - plan
  - ui-kit
  - apolyx
  - data
  - Apolyx-S0002
---

# Phase 5 — data components

> Who: apollo. Presentation + semantics only; sorting / virtualization deferred.

Sprint index: [[README]]

| Component | Parts | Notes |
|-----------|-------|-------|
| Table | `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, `TableCell`, `TableCaption` | Scroll wrapper; `density` (`compact` / `default`), `striped`, sticky header option; row hover uses `--accent-hover`; `data-state="selected"` row style |
| List | `List`, `ListItem`, `ListItemLeading`, `ListItemContent`, `ListItemTitle`, `ListItemDescription`, `ListItemTrailing` | `variant` (`plain` / `divided` / `card`); interactive items via `asChild` |
| Grid | `Grid` (`cols` 1–6 or responsive object, `gap`) | CSS grid layout helper for cards / tiles |

## Tasks

- [x] `table.tsx`, `list.tsx`, `grid.tsx`
- [x] Stories: data table with badges, list of users, grid of cards
- [x] Test: Table renders semantics

## Done when

A dashboard page (table + list + grid) is composable from Apolyx parts.
