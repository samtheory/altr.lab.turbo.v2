---
title: "Phase 2 — engine schema DDL"
description: "Port + planners + both adapters for drop/rename/type"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0016
  - engine
---

# Phase 2 — engine schema DDL

> Who: **saga** / **sindri**.

Sprint: [[README]]

## Status

**done** (2026-10-24)

## Work

- Planners in `elements/jord/src/schema/` (extend `ddl.ts` or sibling) — reserved + ident + PK guards before SQL
- `dropTable` / `renameTable` / `renameColumn` / `dropColumn` / `changeColumnType` on `JordDriverPort`
- **LibSqlAdapter** + **PostgresAdapter**
- Type change: rebuild table (create → copy with CAST → drop → rename) so both dialects share one semantics
- Unit tests: reserved, missing, rename conflict, drop PK blocked, type change empty + with coercible rows

## Done when

- [ ] Engine tests cover happy path + error codes on both adapters (Postgres live may skip if no DSN)
