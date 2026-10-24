---
title: "Jord — schema"
description: "List and describe tables, CREATE TABLE, ADD COLUMN, and admin DROP / RENAME / type change"
created: 2026-10-24
updated: 2026-10-24
tags:
  - tech-space
  - jord
  - schema
  - ddl
---

# Jord — schema

> Who: anyone changing tables. Row DML: [[../writes/README]]. Admin role: [[../auth/README]].

## Why

Studio needs to see real SQL tables and change them through the server, on both libSQL and Postgres, without shipping a SQL console.

## What

Column types accepted from the API: `TEXT`, `INTEGER`, `REAL`, `BLOB`. Postgres stores `REAL` as `DOUBLE PRECISION` and `BLOB` as `BYTEA`.

| Method | Path | Who | Result |
|--------|------|-----|--------|
| `GET` | `/schema/tables` | authenticated | `{ tables }` |
| `GET` | `/schema/tables/:name` | authenticated | columns, or 404 |
| `GET` | `/schema/tables/:name/rows` | authenticated | 1–100 rows, read-only |
| `POST` | `/schema/tables` | admin | `{ name, columns: [{ name, type, pk? }] }` |
| `POST` | `/schema/tables/:name/columns` | admin | `{ name, type }` ADD COLUMN |
| `PATCH` | `/schema/tables/:name` | admin | rename `{ name }` |
| `DELETE` | `/schema/tables/:name` | admin | drop table |
| `PATCH` | `/schema/tables/:name/columns/:column` | admin | `{ name?, type? }` |
| `DELETE` | `/schema/tables/:name/columns/:column` | admin | drop column |

CREATE requires exactly one primary key. If none is marked and `id` exists, `id` becomes PK; otherwise Jord prepends `id TEXT PRIMARY KEY`. Reserved names (`records`, `jord_*`, `sqlite_*`, `pg_*`) → **400**. Duplicate table or column → **409**. Type change rebuilds the table and `CAST`s values. Changing or dropping the primary-key column is rejected.

All DDL runs on the write queue.

## How

| Piece | Path |
|-------|------|
| Introspect + ADD + CREATE | `elements/jord/src/schema/ddl.ts` |
| DROP / RENAME / type | `elements/jord/src/schema/ddl-alter.ts` |
| Routes | `cloud/jord/src/app.ts` |
| Studio | Schema explorer at `/schema`; catalog `/tables` |

`listTables` uses `sqlite_master` (user tables, skip `sqlite_%`) or the Postgres equivalent. `describeTable` uses `PRAGMA table_info` on libSQL.

## Example

```json
POST /schema/tables
{ "name": "notes", "columns": [{ "name": "title", "type": "TEXT" }] }
```

Jord creates `notes` with a generated `id` primary key plus `title TEXT`. Open it at `/tables/notes`.

## Not in Jord yet

Arbitrary SQL, column-level policies, a migration history UI.
