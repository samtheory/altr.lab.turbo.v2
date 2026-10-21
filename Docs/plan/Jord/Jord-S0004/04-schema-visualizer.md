---
title: "Phase 4 — schema visualizer"
description: "Minimal table/column graph or structured canvas for current schema"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - jord
  - Jord-S0004
---

# Phase 4 — schema visualizer

> Who: **apollo**. Read-only view of introspected schema. Relations optional (none in Slice 0).

Sprint index: [[README]]

## UI

- Same `/schema` surface: toggle or split **Browser** | **Visualizer**
- One node per table; column list inside or beside the node
- Works with a single `records` table; scales to N tables from `listTables`
- Apolyx tokens only — no Radix graph library unless already in kit (prefer CSS/SVG composition)

## Out of this card

- Drag-edit schema that writes DDL (that is card 5)
- FK / relation lines until tables have FKs to show

## Status

**done** (2026-10-21)

## Tasks

- [x] Visualizer view fed by same schema fetch as browser
- [x] Accessible structure (not canvas-only; keep a text/table fallback)

## Done when

Operator can see a visual summary of tables/columns without leaving Studio.

