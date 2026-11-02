---
title: "tech_space/ui-kit — Apolyx as-built index"
description: "Index of as-built notes for Apolyx (@altr/apolyx) from sprints Apolyx-S0001 through Apolyx-S0005 + DataGrid (apolyx-F0008)"
created: 2026-10-11
updated: 2026-11-02
tags:
  - tech-space
  - ui-kit
  - apolyx
  - Apolyx-S0005
  - datagrid
  - readme
---

# tech_space / ui-kit — Apolyx

> Who: anyone reading how Apolyx was actually built. Prefer this over plan text when they disagree. Latest closed sprint: **Apolyx-S0005** ([[10-s0005-product-gate]]). **DataGrid** column-ops slice shipped with Jord [[../../plan/Jord/phase-03/done/S0056-grid-column-ops|S0056]] ([[../../feature_list/ui-kit/apolyx-F0008-datagrid|apolyx-F0008]]).

| Note | Covers |
|------|--------|
| [[00-package-and-themes]] | Package rename, OKLCH themes, ApolyxProvider |
| [[01-primitives-and-wave1]] | Primitives (no Radix), wave-1 components |
| [[02-motion-charts-cli-docs]] | Motion + charts (early note; see also 04/05) |
| [[03-overlays]] | Dialog, DropdownMenu, Tabs, Tooltip, Toast, layer stack |
| [[04-registry-and-cli]] | Registry manifests, import-resolution build, CLI smoke |
| [[05-docs-app]] | `apps/apolyx` MDX shell, collapsible sidebar groups, demos, `/r` registry |
| [[06-s0002-contrast-nav-switch-field-data]] | Hover tokens, nav, physics Switch, Field, Table / List / Grid |
| [[07-timeline]] | Timeline rail geometry, step states, tones, layouts |
| [[08-s0003-switch-inputs]] | Switch family, ControlBox, Password / Number / OTP / Mask, Forms group |
| [[09-s0004-popover]] | Popover parts, click/hover, origin-aware motion (67 registry, 149 tests) |
| [[10-s0005-product-gate]] | **S0005:** Select, Combobox, Pagination, Scroll Area, Progress, Accordion, Radio Group (74 registry, 163 tests) |
| **DataGrid (F0008)** | `elements/ui-kit/src/components/ui/data-grid*.tsx` — virtualized body, column ops, typed filter builder, controlled layout; docs `/docs/components/data-grid`; registry `data-grid`. Editing / `onCellCommit` / live patch hooks still open for Jord [[../../plan/Jord/phase-03/S0058-inline-edit-live-sync\|S0058]]. |

Sprint screenshots (Docs only, not used by apps): `Docs/tech_space/ui-kit/assets/` (`apolyx-s0001` … `apolyx-s0004`, `apolyx-sidebar`, `apolyx-timeline`).

Intent: [[../../feature_list/ui-kit/00-intent]] · Sprint plans: [[../../plan/ui-kit/README]] · Carry-overs: [[../../feature_list/ui-kit/01-apolyx-s0001-carryovers]] · Status: [[../../report/STATUS]]

Prior notes (historical names): [[../01-hub-ui-kit-base]] · [[../02-ui-kit-storybook]]
