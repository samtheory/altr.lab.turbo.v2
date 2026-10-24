---
title: "Jord-S0016 — schema DROP / RENAME / type change"
description: "Done: admin DDL to drop/rename tables and columns, change column types"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0016
  - jord-studio
  - sprint
  - schema
  - ddl
---

# Jord-S0016 — schema DROP / RENAME / type change

> Who: **mimir**. **Status: done (2026-10-24).** Prior: [[../Jord-S0015/README]]. As-built: [[../../../../tech_space/jord/schema]]. Next: [[../../phase-02/00-remaining-backlog]] (S0017). **Last numbered:** Jord-S0020.

**Sprint id:** `Jord-S0016`  
**Opened:** 2026-10-24 · **Closed:** 2026-10-24 · **Owner:** mimir  
**Hats:** **saga** · **sindri** · **heimdall** · **apollo** · **docs_man**

## Why this next

S0012 CREATE + ADD COLUMN and S0015 row writes left schema additive-only. Operators needed drop / rename / type fix without hand-SQL.

## Design lock (v1) — shipped

| Piece | Choice |
|-------|--------|
| Scope | User tables only. Reserved → 400 |
| DROP / RENAME table | Hard drop; rename with CREATE-name rules; conflict 409 |
| Column | Rename, drop (non-PK), type change via rebuild + CAST |
| Auth | Admin (`requireAlterSchema`) |
| Writes | Single write queue |

## Phases

| # | Card | Hat | Status |
|---|------|-----|--------|
| 1 | [[01-contract]] | mimir / saga | **done** |
| 2 | [[02-engine-ddl]] | saga / sindri | **done** |
| 3 | [[03-server-routes]] | sindri / heimdall | **done** |
| 4 | [[04-studio-schema]] | apollo | **done** |
| 5 | [[05-role-gates]] | heimdall / apollo | **done** |
| 6 | [[06-verify]] | mimir → docs_man | **done** |

## Definition of done

- [x] Port drop / rename / alter column (libSQL + Postgres)
- [x] Reserved + PK guards
- [x] Server routes on write queue; admin-only
- [x] Studio schema UI with confirm on drops
- [x] Editor / readonly → 403
- [x] Tests green; as-built [[../../../../tech_space/jord/schema]]
- [x] Closed; next = S0017 on [[../../phase-02/00-remaining-backlog]]

## Explicitly out

- Native Postgres RLS (S0017)
- Realtime / CDC for DDL (S0018)
- Hosted `libsql://` (S0019)
- Hard sqlite-vec / pgvector (S0020 — **last numbered**)
- FK / CASCADE / PK identity change
