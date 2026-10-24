---
title: "Jord-S0010 — Studio S8 Postgres connection"
description: "Done: PostgresAdapter for postgres:// URLs; file: stays the lab default"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0010
  - jord-studio
  - sprint
  - postgres
---

# Jord-S0010 — Studio S8 Postgres connection

> Who: **mimir**. **Status: done (2026-10-24).** Intent S8: [[../../../feature_list/Jord/03-jord-studio]]. Dialect port: [[../../../feature_list/Jord/02-architecture]]. As-built: [[../../../tech_space/jord/09-s0010-postgres]]. Prior: [[../Jord-S0009/README]].

**Sprint id:** `Jord-S0010`  
**Opened:** 2026-10-24 · **Closed:** 2026-10-24 · **Owner:** mimir  
**Hats:** **sindri** · **saga** · **heimdall** · **apollo** · **docs_man**

## Phases

| # | Card | Hat | Status |
|---|------|-----|--------|
| 1 | [[01-dialect-contract]] | mimir / saga | **done** |
| 2 | [[02-postgres-adapter]] | sindri / saga | **done** |
| 3 | [[03-server-dialect]] | sindri | **done** |
| 4 | [[04-studio-connection]] | apollo | **done** |
| 5 | [[05-role-gates]] | heimdall / apollo | **done** |
| 6 | [[06-verify]] | mimir → docs_man | **done** |

## Definition of done

- [x] Every card's "Done when" holds
- [x] `createJordClient` opens `LibSqlAdapter` for `file:` and `PostgresAdapter` for `postgres://` / `postgresql://`
- [x] `libsql://` stays rejected (hosted libSQL is a later slice)
- [x] Control-plane tables migrate on Postgres open
- [x] OCC on `records.version` still returns HTTP **409**
- [x] Timestamps stay 64-bit-safe milliseconds (Postgres `bigint`)
- [x] Server `/health` reports `dialect: "libsql" | "postgres"`
- [x] Studio shows the live dialect; browser never receives a raw connection string
- [x] Write queue stays in front of hot writes on both dialects
- [x] WAL checkpoint runs only for libSQL
- [x] Default test suite passes without a running Postgres; live round-trip gated on `JORD_TEST_POSTGRES_URL`
- [x] No kit primitives invented in `apps/jord-studio`
- [x] As-built `Docs/tech_space/jord/09-s0010-postgres.md`

## Explicitly out of this sprint

- Hosted `libsql://` (Turso)
- Native Postgres RLS / `CREATE TRIGGER`
- `pgvector` / realtime / blobs
- Studio UI that pastes and switches `DATABASE_URL`

## Links

- Track: [[../README]]
- As-built: [[../../../tech_space/jord/09-s0010-postgres]]
