---
title: "Jord-S0022 — Table API (PostgREST-lite) + OpenAPI"
description: "Typed filters, caps, return=representation, no unfiltered write without service all=true"
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

> Who: **mimir**. **Status: planned.** **Execution #7.** Blocked by [[../Jord-S0028/README]]. Next: [[../Jord-S0023/README]].

**Sprint id:** `Jord-S0022`  
**Hats:** **sindri** · **saga** · **heimdall** · **apollo** · **docs_man**

## Goal

PostgREST-lite table CRUD for app clients, with OpenAPI and a Studio playground. No embeds or joins.

## In scope

- `/api/v1/:table` GET, POST, PATCH, DELETE
- Operators: `eq neq gt gte lt lte like ilike in is`
- `select`, `order`, `limit`, `offset`
- **Coerce** query-string values to the introspected column type before bind
- **`ilike` on libSQL** is `lower(column) LIKE lower(?)`. Document this (Unicode case folding is not Postgres `ILIKE`)
- Caps: default limit **100**, max limit **1000**, max `in(...)` list **100** values, max JSON body **1 MiB** (S0028 body limit still applies)
- PATCH and DELETE **without a filter are rejected**. `?all=true` is allowed **only for `service`**
- Keys: tables with no PK use SQLite `rowid` / Postgres `ctid` only when a single integer row id exists; **composite primary keys are supported** as repeated `pk` query params in declared column order. Tables with no stable key reject PATCH/DELETE
- `Prefer: count=exact` is **costly** (full count). Ship **`Prefer: count=planned`** (planner/estimate, may be null on libSQL) and document that `count=exact` is opt-in and slow. Do not make `exact` the default
- `Prefer: return=representation` uses **`RETURNING`** on both dialects
- Identifier allow-list from introspection; bind every value
- Optional OCC when a `version` column exists (409)
- Honor S0021 policies + generated-API disable list
- `GET /api/v1/openapi.json` from introspection. Clients use `openapi-typescript` (no custom generator)
- Studio docs page + playground (Apolyx-first)
- Generated OpenAPI types plus a thin fetch helper **inside the S0022 test folder** (e.g. `cloud/jord/src/table-api/__tests__/fetch-helper.ts` or the suite's local helper path). The helper uses `fetch` only and **must not import `@altr/jord`**. S0029 promotes that helper into `@altr/jord-client`

## Out of scope

Embeds · joins · custom TS generator

## File-level change list (expected)

| Area | Paths |
|------|-------|
| Server | `cloud/jord/src` — table router, coerce, OpenAPI |
| Engine | `elements/jord` — RETURNING helpers if shared |
| Studio | `apps/jord-studio` — docs + playground |
| Docs | `tech_space/jord/apis` |

## Tests required

Filter coerce; ilike lower() on libSQL; cap rejection; PATCH/DELETE without filter → 400; `all=true` denied for user/anon/operator; service `all=true` allowed; composite pk round-trip; `return=representation`; policy deny; file libSQL always; Postgres opt-in.

## Definition of Done

- [ ] No SQL concatenation of user input
- [ ] Caps and `all=true` rules tested
- [ ] `count=planned` documented; `count=exact` marked costly
- [ ] RETURNING works on both dialects in the conformance suite
- [ ] Category `apis` updated
- [ ] Test-folder `fetch-helper` typechecks with no `@altr/jord` import; a test calls it against the table route
