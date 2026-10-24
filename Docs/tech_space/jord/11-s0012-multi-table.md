---
title: "Jord-S0012 — multi-table browse + CREATE TABLE as-built"
description: "User CREATE TABLE on both dialects, generic row browse, Studio schema create and table open"
created: 2026-10-24
updated: 2026-10-24
tags:
  - tech-space
  - jord
  - Jord-S0012
  - jord-studio
  - schema
  - multi-table
---

# Jord-S0012 — multi-table browse + CREATE TABLE as-built

> Who: mimir / operators after the table gap. Plan: [[../../plan/Jord/Jord-S0012/README]] · Prior schema: [[03-s0004-schema]] · Intent: [[../../feature_list/Jord/03-jord-studio]].

## Contract

| Piece | Decision |
|-------|----------|
| Create | `POST /schema/tables` `{ name, columns: [{ name, type, pk? }] }` through `enqueueWrite` |
| Types | `TEXT` \| `INTEGER` \| `REAL` \| `BLOB` (Postgres: `DOUBLE PRECISION` / `BYTEA`) |
| Primary key | Exactly one. If none is marked, an existing `id` column becomes PK; otherwise prepend `id TEXT PRIMARY KEY` |
| Reserved | `records`, `jord_*`, `sqlite_*`, `pg_*` → **400** `reserved` |
| Duplicate | Existing table → **409** `table_exists` (no silent `IF NOT EXISTS`) |
| Browse | `GET /schema/tables/:name/rows?limit=&offset=` clamped to 1–100 rows. Read-only |
| `records` | Still the OCC editor at `/records`. `/tables/records` redirects there |
| Auth | Create = `requireAlterSchema` (admin). Browse follows existing session read |
| Browser | Never opens `data/jord.db` |

## Engine (`@altr/jord`)

| Piece | Role |
|-------|------|
| `src/schema/ddl.ts` | `planCreateTable`, `buildCreateTableSql`, `isReservedCreateTableName`, row window clamp |
| `LibSqlAdapter` / `PostgresAdapter` | `createTable`, `listTableRows` |

## Server (`@altr/jord-server`)

`POST /schema/tables` and `GET /schema/tables/:name/rows` in `src/app.ts`.

## Studio (`apps/jord-studio`)

| Piece | Role |
|-------|------|
| Schema explorer | Create-table form + Open table (`@altr/apolyx`) |
| `/tables` | Catalog list |
| `/tables/[name]` | Generic row grid |
| BFF | `POST /api/schema/tables`, `GET /api/schema/tables/[name]/rows` |
| Nav | **Tables** and **Records editor** are separate |

## Verify

- `@altr/jord` tests 18 passed (1 postgres live skipped)
- `@altr/jord-server` tests 26 passed, including admin create + readonly browse + reserved 400 + duplicate 409
- Studio typecheck clean
- Browser: created `lab_notes_s0012` from Schema, opened empty grid at `/tables/lab_notes_s0012`, `/tables` lists it, `/tables/records` redirects to the records editor

## Out of this sprint

DROP / RENAME, generated CRUD for every new table, row writes on user tables, blobs, vectors, hosted `libsql://`.
