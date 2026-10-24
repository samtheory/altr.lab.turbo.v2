---
title: "Phase 1 — multi-table + CREATE TABLE contract"
description: "Naming, reserved tables, create payload, open/browse v1 scope"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0012
  - contract
  - schema
---

# Phase 1 — multi-table + CREATE TABLE contract

> Who: **mimir** (scope) · **saga** (DDL / idents). Engine and Studio implement against this note.

Sprint index: [[README]] · Prior: [[../Jord-S0004/README]]

## Status

**done** (2026-10-24)

## Goal

Lock what “create table” and “open table” mean in v1 — without promising DROP/RENAME or full generated CRUD for every table.

## CREATE TABLE (v1)

| Piece | Choice |
|-------|--------|
| API | `POST /schema/tables` body: `{ name, columns: [{ name, type }] }` |
| Types | Same as ADD COLUMN: `TEXT` \| `INTEGER` \| `REAL` \| `BLOB` (libSQL); Postgres maps via existing type helpers |
| Identifiers | Existing `isValidSqlIdent` — reject anything else with 400 |
| Minimum | ≥1 column required |
| Primary key | Exactly one. Unmarked columns: existing `id` becomes PK, otherwise prepend `id TEXT PRIMARY KEY` |
| Queue | Always via `enqueueWrite` |
| Idempotency | `IF NOT EXISTS` → soft success **or** 409 `table_exists` — prefer **409** so Studio can show a clear conflict |

### Reserved names (reject 400)

- `records` (engine scratchpad — alter columns only)
- Any name matching `jord_%` / `sqlite_%` / Postgres system schemas
- Empty / too-long names (align with existing ident rules)

## Open / browse (v1)

| Piece | Choice |
|-------|--------|
| List | Schema already lists via `GET /schema/tables` |
| Open | Studio Tables nav becomes a **table picker** (not “records only”) |
| Rows | Generic read: `GET /schema/tables/:name/rows?limit=&offset=` (or equivalent) — no OCC editor for arbitrary shapes |
| `records` | Keep today’s bucket + OCC editor as the special case when name === `records` |
| Mutations on user tables | Out of v1 unless cheap: prefer browse + schema alter first; insert/update/delete for generic tables = follow-up |

## Auth

| Action | Role |
|--------|------|
| CREATE TABLE | Same as ADD COLUMN → `admin` (`requireAlterSchema`) |
| List / describe / browse rows | Existing read / generated-read paths; `readonly` may browse |

## Done when

- [x] This contract is agreed in the sprint README (no open “TBD” on reserved names or HTTP shape)
- [x] Out-of-scope list on [[README]] still accurate
