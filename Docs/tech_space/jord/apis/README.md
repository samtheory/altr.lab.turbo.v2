---
title: "Jord — APIs"
description: "Generated records CRUD catalog, built-in function steps, and custom /x/:slug bindings"
created: 2026-10-24
updated: 2026-10-25
tags:
  - tech-space
  - jord
  - apis
---

# Jord — APIs

> Who: anyone exposing or disabling HTTP. Roles: [[../auth/README]]. Writes inside steps: [[../writes/README]].

## Why

Studio should show which HTTP exists and let an admin turn a surface off, without uploading JavaScript. Functions are ordered built-in steps. Custom APIs are a method + slug bound to a function.

## What

**Generated catalog** (in-process Map, seeded by `JORD_GENERATED_API_DISABLED`). Resource in the catalog today: `records`. Read: any authenticated role. Toggle: admin. Disabled calls return **503** `{ error: "api_disabled", resource }`. Schema routes are not in this catalog.

| Method | Path |
|--------|------|
| `GET` | `/apis/generated` and `/apis/generated/:resource` |
| `PATCH` | `/apis/generated/:resource` `{ enabled }` |

**Functions** persist in `jord_functions`. Steps: `echo`, `records_list`, `records_get`, `records_insert`, `records_count`. No `eval`. Invoke is editor+. Manage is admin. Delete returns **409** `has_dependents` while a custom API still points at the function.

| Method | Path |
|--------|------|
| `GET` / `POST` | `/functions` |
| `PATCH` / `DELETE` | `/functions/:id` |
| `POST` | `/functions/:id/invoke` |

**Custom APIs** persist in `jord_custom_apis`. Dispatch is `ALL /x/:slug`. Disabled → **503** `{ error: "api_disabled", kind: "custom", id }`. Optional seed: `JORD_CUSTOM_API_DISABLED`.

## How

| Piece | Path |
|-------|------|
| Generated registry | `cloud/jord/src/generated-api/` |
| Step runner | `cloud/jord/src/functions/` |
| Tables | `elements/jord/src/schema/functions.ts` |
| Studio | `/apis/generated`, Function APIs, Custom APIs |

Step writes call `enqueueWrite`. `records_*` steps use the same policy gate as HTTP.

## Example

Bind `POST /x/count-notes` to a function whose only step is `records_count`. An editor `POST /x/count-notes` runs the pipeline. A readonly token gets **403**. An admin toggle off returns **503** on the next call.

## Table API (S0022)

Authenticated `GET|POST|PATCH|DELETE /api/v1/:table` and `GET /api/v1/openapi.json`. Filters are `column=op.value` with `eq neq gt gte lt lte like ilike in is`. Values are coerced to the introspected column type and bound. Identifiers come from that column list only.

`ilike` is `lower(column) LIKE lower(?)` on libSQL. That is not Postgres Unicode `ILIKE`.

Caps: default limit **100**, max **1000**, `in(...)` max **100**, JSON body **1 MiB** (S0028). PATCH and DELETE without a filter return **400**. `?all=true` is **service only**. A table with no primary key rejects PATCH and DELETE. Composite keys are repeated `pk` query params in column order.

`Prefer: count=planned` may return `count: null` on libSQL (no planner estimate). `Prefer: count=exact` runs `COUNT(*)` and is costly. It is not the default. `Prefer: return=representation` uses `RETURNING` (verified on file libSQL; Postgres not run here).

`records` still honors `JORD_GENERATED_API_DISABLED` (**503**). User and anon stay default-deny until a policy allows the table. `/api/v1` shares the data-route limit (120 / minute) and idempotency.

Studio playground: `/apis/table` (Apolyx). The fetch helper used by tests is `cloud/jord/src/table-api/__tests__/fetch-helper.ts`. It does not import `@altr/jord`.

## Not in Jord yet

Embeds, joins, per-operation toggles, arbitrary SQL steps, user-uploaded code, a generated catalog per user table. Postgres RETURNING for this route was not run.
