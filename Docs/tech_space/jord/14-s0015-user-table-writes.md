---
title: "Jord-S0015 — user-table row writes (as-built)"
description: "Insert, update, and delete rows on user tables; Studio grid; records OCC unchanged"
created: 2026-10-24
updated: 2026-10-24
tags:
  - tech-space
  - jord
  - Jord-S0015
  - schema
  - multi-table
---

# Jord-S0015 — user-table row writes (as-built)

> Who: anyone editing user tables. Plan: [[../../plan/Jord/Jord-S0015/README]]. Prior browse: [[11-s0012-multi-table]].

## What shipped

| Layer | Change |
|-------|--------|
| `@altr/jord` | `insertTableRow` / `updateTableRow` / `deleteTableRow` on libSQL and Postgres. Planner in `schema/row-write.ts` |
| Identity | Exactly one primary key. Reserved names (`records`, `jord_*`, `sqlite_*`, `pg_*`) rejected |
| `@altr/jord-server` | `POST /schema/tables/:name/rows`, `PATCH` and `DELETE …/rows/:pk` on the write queue. `canWriteTableRows` = editor+ |
| Studio | `/tables/[name]` insert, edit, delete via BFF. `records` still redirects to the OCC editor |

## HTTP

| Method | Path | Role |
|--------|------|------|
| `GET` | `/schema/tables/:name/rows` | any authenticated |
| `POST` | `/schema/tables/:name/rows` `{ values }` | `editor`+ |
| `PATCH` | `/schema/tables/:name/rows/:pk` `{ values }` | `editor`+ |
| `DELETE` | `/schema/tables/:name/rows/:pk` | `editor`+ |

| Result | Status |
|--------|--------|
| Duplicate primary key | 409 `pk_exists` |
| Missing row | 404 `not_found` |
| Reserved / bad type / unknown column | 400 |

No OCC `version` on user tables. No generated API catalog per table.

## Verify

- `pnpm --filter @altr/jord test` — `schema/row-write.test.ts` and create-table case now covers DML
- `pnpm --filter @altr/jord-server test` — editor write, readonly 403, duplicate 409, reserved 400
- Manual: Studio → create table → `/tables/<name>` → insert, edit, delete

## Not in this ship

DROP / RENAME — **shipped** [[15-s0016-schema-drop-rename]] · user-table OCC · realtime fanout · per-table OpenAPI.
