---
title: "Jord-S0016 — schema DROP / RENAME / type change (as-built)"
description: "Admin DDL: drop/rename tables, rename/drop columns, rebuild type change"
created: 2026-10-24
updated: 2026-10-24
tags:
  - tech-space
  - jord
  - Jord-S0016
  - schema
  - ddl
---

# Jord-S0016 — schema DROP / RENAME / type change (as-built)

> Who: operators altering user-table schema. Plan: [[../../plan/Jord/Jord-S0016/README]]. Prior: [[11-s0012-multi-table]] · [[14-s0015-user-table-writes]].

## What shipped

| Layer | Change |
|-------|--------|
| `@altr/jord` | `dropTable` · `renameTable` · `dropColumn` · `alterColumn` on libSQL + Postgres. Planners in `schema/ddl-alter.ts` |
| Type change | Table rebuild + `CAST` (both dialects). PK type change blocked. Drop PK blocked |
| Reserved | Same set as CREATE: `records`, `jord_*`, `sqlite_*`, `pg_*` |
| `@altr/jord-server` | DDL routes on write queue + `requireAlterSchema` (admin) |
| Studio | Schema explorer: rename/drop table, rename/type/drop column (confirm on drops). Apolyx-only |

## HTTP

| Method | Path | Body |
|--------|------|------|
| `DELETE` | `/schema/tables/:name` | — |
| `PATCH` | `/schema/tables/:name` | `{ name }` |
| `PATCH` | `/schema/tables/:name/columns/:column` | `{ name?, type? }` |
| `DELETE` | `/schema/tables/:name/columns/:column` | — |

| Result | Status |
|--------|--------|
| Reserved / bad ident / PK rules / empty patch | 400 |
| Missing table / column | 404 |
| Target table / column already exists | 409 |
| Non-admin | 403 |

## Verify

- `@altr/jord` — `ddl-alter.test.ts` + introspect DDL alter case (34 passed, 1 skipped)
- `@altr/jord-server` — `schema DDL: admin drop/rename/type; editor forbidden` (31 passed)
- Studio `tsc --noEmit` clean

## Not in this ship

Native Postgres RLS (S0017) · WebSockets / multi-table fanout (S0018) · hosted `libsql://` (S0019) · hard sqlite-vec / pgvector (**S0020 last numbered**) · FK / CASCADE · PK identity change.
