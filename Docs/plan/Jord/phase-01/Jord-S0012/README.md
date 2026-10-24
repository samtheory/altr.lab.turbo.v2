---
title: "Jord-S0012 — multi-table browse + CREATE TABLE"
description: "Done: create user tables via Jord, open/browse them in Studio (beyond locked records)"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0012
  - jord-studio
  - sprint
  - schema
  - multi-table
---

# Jord-S0012 — multi-table browse + CREATE TABLE

> Who: **mimir**. **Status: done (2026-10-24).** Intent surfaces: [[../../../../feature_list/Jord/03-jord-studio]]. Prior schema: [[../Jord-S0004/README]] · realtime closed: [[../Jord-S0011/README]]. As-built: [[../../../../tech_space/jord/schema]].

**Sprint id:** `Jord-S0012`  
**Opened:** 2026-10-24 · **Closed:** 2026-10-24 · **Owner:** mimir  
**Hats:** **saga** · **sindri** · **heimdall** · **apollo** · **docs_man**

## Why this next (override of “S10 blobs”)

Operator feedback + code truth: Studio still cannot **create** tables or **open** anything except the hardcoded `records` browser. Schema S2 (S0004) shipped introspect + `ADD COLUMN` only — UI copy still says *“no DROP / RENAME / CREATE TABLE.”* Nav is labeled **Tables · records**.

Blobs (old S10) and vectors stay later. Finishing Jord’s core control plane means **tables first**.

## Gap (code truth)

| Surface | Today |
|---------|--------|
| `JordDriverPort` | `listTables` · `describeTable` · `addColumn` — **no** `createTable` |
| Server | `GET /schema/tables`, `GET …/:name`, `POST …/:name/columns` |
| Studio Schema | List + ADD COLUMN; create blocked in copy |
| Studio Tables | `/records` only (bucket filter + OCC editor) |

## Phases

| # | Card | Hat | Status |
|---|------|-----|--------|
| 1 | [[01-contract]] | mimir / saga | **done** |
| 2 | [[02-engine-create-table]] | saga / sindri | **done** |
| 3 | [[03-server-routes]] | sindri / heimdall | **done** |
| 4 | [[04-studio-create-ui]] | apollo | **done** |
| 5 | [[05-studio-open-browse]] | apollo | **done** |
| 6 | [[06-verify]] | mimir → docs_man | **done** |

## Definition of done

- [x] Operator can **Create table** (name + ≥1 column) from Studio Schema (admin)
- [x] New table appears in schema list and can be **opened** for row browse in Studio
- [x] Reserved / system tables (`records`, `jord_*`) cannot be overwritten via CREATE
- [x] DDL goes through the single write queue; browser never opens `data/jord.db`
- [x] libSQL + Postgres adapters both support create
- [x] Role gates: create = same as alter schema (`admin`); browse follows existing read rules
- [x] Tests + typecheck green; as-built `Docs/tech_space/jord/schema/README.md`
- [x] No kit primitives invented in `apps/jord-studio` (Apolyx-first)

## Explicitly out of this sprint

- `DROP TABLE` / `RENAME` / column type change / FK designer
- Auto-register generated CRUD for every new table (optional follow-up; v1 may expose read-only generic browse)
- Full OCC/`bucket` editor for non-`records` shapes (generic grid is enough)
- Blob buckets / vectors / hosted `libsql://` / Artemis trading tables as product screens
- Realtime fanout for arbitrary tables beyond existing `records` channel (seam only)

## Links

- Track: [[../README]]
- Intent: [[../../../../feature_list/Jord/03-jord-studio]] · Later: [[../../../../feature_list/Jord/01-phase-02-candidates]]
- Roadmap: [[../../../00-roadmap-apolyx-jord-artemis]]
