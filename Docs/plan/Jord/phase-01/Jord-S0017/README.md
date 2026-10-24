---
title: "Jord-S0017 — native Postgres RLS from Jord policies"
description: "Done: compile jord_policies to Postgres RLS; libSQL keeps middleware"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0017
  - jord-studio
  - sprint
  - policies
  - rls
  - postgres
---

# Jord-S0017 — native Postgres RLS from Jord policies

> Who: **mimir**. **Status: done (2026-10-24).** Prior: [[../Jord-S0016/README]]. As-built: [[../../../../tech_space/jord/policies]]. Next: [[../../phase-02/00-remaining-backlog]] (S0018). **Last numbered:** Jord-S0020.

**Sprint id:** `Jord-S0017`  
**Opened:** 2026-10-24 · **Closed:** 2026-10-24 · **Owner:** mimir  
**Hats:** **saga** · **sindri** · **heimdall** · **apollo** · **docs_man**

## Why this next

S0009 shipped durable policies + libSQL middleware. Architecture promised Postgres RLS compile once `PostgresAdapter` existed (S0010).

## Design lock (v1) — shipped

| Piece | Choice |
|-------|--------|
| Source of truth | `jord_policies` |
| libSQL | Middleware only |
| Postgres | One `CASE` policy per operation + FORCE RLS; sync on CRUD + open |
| HTTP 403 | Middleware on both dialects |
| GUCs | `jord.role` / `jord.bucket` |
| Studio | Dialect hint on Policies panel |

## Phases

| # | Card | Hat | Status |
|---|------|-----|--------|
| 1 | [[01-contract]] | mimir / saga / heimdall | **done** |
| 2 | [[02-engine-compile]] | saga / sindri | **done** |
| 3 | [[03-server-session-sync]] | sindri / heimdall | **done** |
| 4 | [[04-studio-hint]] | apollo | **done** |
| 5 | [[05-verify]] | mimir → docs_man | **done** |

## Definition of done

- [x] Port compile + sync + bind session
- [x] Policy CRUD syncs RLS on Postgres
- [x] Middleware 403 unchanged
- [x] Planner unit tests; packages green
- [x] Studio dialect hint
- [x] As-built [[../../../../tech_space/jord/policies]]; next = S0018

## Explicitly out

- Non-`records` RLS · column-level claims · drop middleware on PG · S0018–S0020
