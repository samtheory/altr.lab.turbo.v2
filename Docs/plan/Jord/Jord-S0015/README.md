---
title: "Jord-S0015 — user-table row writes"
description: "Done: insert/update/delete rows on user tables; Studio grid editor"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0015
  - jord-studio
  - sprint
  - schema
  - multi-table
---

# Jord-S0015 — user-table row writes

> Who: **mimir**. **Status: done (2026-10-24).** Prior: [[../Jord-S0012/README]] · [[../Jord-S0014/README]]. As-built: [[../../../tech_space/jord/14-s0015-user-table-writes]]. Next: [[../00-remaining-backlog]] (S0016).

**Sprint id:** `Jord-S0015`  
**Opened:** 2026-10-24 · **Closed:** 2026-10-24 · **Owner:** mimir  
**Hats:** **saga** · **sindri** · **heimdall** · **apollo** · **docs_man**

## Why this next

S0012 lets an operator **create** a user table and **browse** rows. Insert / update / delete still exist only on the OCC scratchpad `records`. The table grid is read-only, so multi-table is not yet an editor.

## Gap (code truth)

| Surface | Today |
|---------|--------|
| `JordDriverPort` | `insertRecord` / `updateRecord` / `deleteRecord` — **`records` only** |
| User tables | `createTable` + `listTableRows` (read window) |
| Server | `GET /schema/tables/:name/rows` — no write |
| Studio | `/tables/[name]` generic grid, no insert/edit/delete |
| `records` | Stays the OCC editor at `/records` |

## Design lock (v1)

| Piece | Choice |
|-------|--------|
| Scope | User tables only. Reject `records`, `jord_*`, `sqlite_*`, `pg_*` (same reserved set as CREATE) |
| Identity | Single primary key column already required by CREATE TABLE |
| Insert | JSON object of column → value; missing PK → 400; duplicate PK → 409 |
| Update | By PK path; body is column patch; unknown column / bad type → 400; missing row → 404 |
| Delete | By PK; missing row → 404 |
| OCC | **Not** on arbitrary tables. `records.version` stays as-is |
| Types | `TEXT` · `INTEGER` · `REAL` · `BLOB` (same as S0012). No JSON/FK designer |
| Writes | Single write queue |
| Generated API | Do **not** auto-mint a full CRUD catalog per table. Generic REST is enough |
| Browser | Studio → BFF → jord-server. Never opens `data/jord.db` |
| Roles | Browse = any authenticated; insert/update/delete = `editor`+ |

## Phases

| # | Card | Hat | Status |
|---|------|-----|--------|
| 1 | [[01-contract]] | mimir / saga | **done** |
| 2 | [[02-engine-row-writes]] | saga / sindri | **done** |
| 3 | [[03-server-routes]] | sindri / heimdall | **done** |
| 4 | [[04-studio-editor]] | apollo | **done** |
| 5 | [[05-role-gates]] | heimdall / apollo | **done** |
| 6 | [[06-verify]] | mimir → docs_man | **done** |

## Definition of done

- [x] Port can insert, update, and delete a row on a user table (libSQL + Postgres)
- [x] Reserved tables rejected; duplicate PK → 409; bad column/type → 400
- [x] Server routes on the write queue
- [x] Studio grid: insert, edit, delete a row (Apolyx-only)
- [x] Readonly cannot write; editor can
- [x] `records` OCC routes unchanged
- [x] Tests green; as-built `Docs/tech_space/jord/14-s0015-user-table-writes.md`
- [x] Sprint closed; next card remains [[../00-remaining-backlog]] item 2 (DROP / RENAME → S0016)

## Explicitly out

- DROP / RENAME / type change (S0016)
- OCC / `version` columns on user tables
- Realtime fanout for user-table writes (S0018)
- Auto-generated OpenAPI per table
- Native Postgres RLS (S0017)
- Artemis domain tables

## Links

- Track: [[../README]] · Backlog: [[../00-remaining-backlog]]
- As-built prior: [[../../../tech_space/jord/11-s0012-multi-table]]
