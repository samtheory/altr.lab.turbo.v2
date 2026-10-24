---
title: "Jord-S0022 — Table API (PostgREST-lite) + OpenAPI"
description: "/api/v1/:table CRUD with filters; openapi.json; Studio docs playground"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0022
  - phase-02
  - api
  - openapi
---

# Jord-S0022 — Table API + OpenAPI

> Who: **mimir**. **Status: planned** (blocked on S0021). Feature F4: [[../../../../feature_list/Jord/03-phase-02-features]]. Prior: [[../Jord-S0021/README]]. Next: [[../Jord-S0023/README]].

**Sprint id:** `Jord-S0022`  
**Hats:** **sindri** · **saga** · **heimdall** · **apollo** · **docs_man**

## Goal

Ship a PostgREST-lite table surface for app clients, with generated OpenAPI and a Studio playground — without embeds/joins.

## In scope

- Route `/api/v1/:table` — GET, POST, PATCH, DELETE
- Operators: `eq neq gt gte lt lte like ilike in is`
- `select`, `order`, `limit`, `offset`; header `Prefer: count=exact`
- Validate identifiers against introspection; bind every value
- Optional OCC when user table has `version` (409)
- Honor S0021 policies + generated-API disable list
- `GET /api/v1/openapi.json` from introspection
- Document client gen via `openapi-typescript` (do not build a custom TS generator)
- Studio: API docs page + request playground (Apolyx-first)

## Out of scope

Embeds · joins · custom type generator · changing `/records` beyond coexistence

## File-level change list (expected)

| Area | Paths |
|------|-------|
| Server | `cloud/jord/src` — table router, filter parser, OpenAPI builder |
| Engine | `elements/jord` — identifier/introspection helpers if shared |
| Studio | `apps/jord-studio` — API docs + playground pages |
| Kit | Only if playground needs a missing Apolyx control → **apollo** first |
| Docs | `tech_space/jord/apis` (+ `studio`) |

## Schema

None new (uses introspected user tables + S0021 policies).

## HTTP routes

| Method | Path |
|--------|------|
| GET/POST/PATCH/DELETE | `/api/v1/:table` |
| GET | `/api/v1/openapi.json` |

## Tests required

File libSQL integration for filters/CRUD/OCC/policy deny; Postgres opt-in; OpenAPI shape smoke; role gates on every method.

## Studio

API docs + playground. Never show connection strings or tokens.

## Definition of Done

- [ ] No SQL concatenation of user input
- [ ] Policies from S0021 enforced
- [ ] Studio playground live behind admin (or documented role)
- [ ] Category `apis` (+ `studio`) updated
- [ ] Typecheck jord / jord-server / jord-studio
