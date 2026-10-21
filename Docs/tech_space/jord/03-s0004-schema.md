---
title: "Jord-S0004 — Studio S2 schema foundation as-built"
description: "listTables/describeTable/addColumn; schema HTTP routes; Studio /schema browser + visualizer"
created: 2026-10-21
updated: 2026-10-21
tags:
  - tech-space
  - jord
  - Jord-S0004
  - jord-studio
---

# Jord-S0004 — Studio S2 schema foundation as-built

> Who: mimir / Studio operators after S2 foundation. Plan: [[../../plan/Jord/Jord-S0004/README]] · Prior shell: [[02-s0003-studio-shell]] · Engine Slice 0: [[00-s0001-slice0]].

## Engine (`@altr/jord`)

| API | Behavior |
|-----|----------|
| `listTables()` | `sqlite_master` user tables (exclude `sqlite_%`) |
| `describeTable(name)` | `PRAGMA table_info` → `{ name, columns[] }` or `null` |
| `addColumn({ table, name, type })` | Whitelist `TEXT\|INTEGER\|REAL\|BLOB`; Result errors for bad ident / missing table / duplicate |

Helpers: `elements/jord/src/schema/ddl.ts` (`buildAddColumnSql`, `isValidSqlIdent`, …).

## Server (`@altr/jord-server`)

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/schema/tables` | `{ tables }` |
| `GET` | `/schema/tables/:name` | table + columns; 404 |
| `POST` | `/schema/tables/:name/columns` | `{ name, type }` via **write queue**; 201 + describe; 409 duplicate |

## Studio

| Piece | Path |
|-------|------|
| Nav | Database → Schema visualizer → `/schema` (live) |
| Page | `SchemaExplorer` — Browser \| Visualizer toggle |
| BFF | `/api/schema/tables`, `/api/schema/tables/:name`, `…/columns` |
| Live save | ADD COLUMN form + SQL preview |

Still no DROP / RENAME / CREATE TABLE UI. Browser never opens `data/jord.db`.

## Verify (2026-10-21)

- `pnpm --filter @altr/jord test` — pass (incl. introspect)
- `pnpm --filter @altr/jord-server test` — pass (schema routes)
- `pnpm --filter @altr/jord-studio typecheck` — pass
- Manual BFF: list → describe `records` → ADD COLUMN → 201
