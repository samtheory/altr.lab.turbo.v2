---
title: "Phase 2 — bus widen + user-table emit"
description: "Generalize JordChangeEvent.table; publish from table row routes"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0018
  - realtime
---

# Phase 2 — bus + emit

> Who: **sindri**.

Sprint: [[README]] · Contract: [[01-contract]]

## Status

**done** (2026-10-24)

## Types

- Widen `JordChangeEvent.table` from `"records"` literal to `string` (still validate on subscribe/publish).
- Rename helper `publishRecordChange` → `publishChange` (or keep alias).
- Bus: optional subscribe filter `{ table, id? }` — only deliver matching events (today SSE filters in the handler; keep that or move into bus).

## Emit wiring

After successful:

- Existing `/records*` + function insert path (unchanged semantics)
- `POST/PATCH/DELETE` user-table row routes in `app.ts`

Do **not** emit on schema DDL (CREATE/DROP/RENAME) in this sprint.

## Tests

- Unit: bus filters by table
- Integration: user-table insert → subscriber on that table sees event; `records` subscriber does not

## Done when

- [ ] Multi-table publish works on file: lab DB without WS yet
