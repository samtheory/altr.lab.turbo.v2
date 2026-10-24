---
title: "Phase 2 — engine functions + custom API schema"
description: "Drizzle tables jord_functions / jord_custom_apis; migrate on open; port CRUD"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - jord
  - Jord-S0008
---

# Phase 2 — engine functions + custom API schema

> Who: **sindri** · **saga** (schema / timestamps). Timestamps stay `integer({ mode: 'number' })` ms.

Sprint index: [[README]] · Contract: [[01-api-contract]] · Jobs precedent: [[../Jord-S0007/02-engine-jobs-schema]] · Slice 0 style: [[../../../../tech_space/jord/overview]]

## Status

**done** (2026-10-21)

## Tables

| Table | Purpose |
|-------|---------|
| `jord_functions` | Function definitions + `steps` JSON |
| `jord_custom_apis` | HTTP bindings → `function_id` |

Migrate via `ensureFunctionsSchema(client)` from `ensureRecordsSchema` (same pattern as jobs) — additive `CREATE TABLE IF NOT EXISTS` only.

### Indexes (proposed)

- `jord_functions_slug_uidx` unique on `slug`
- `jord_custom_apis_method_slug_uidx` unique on `(method, slug)`
- `jord_custom_apis_function_id_idx` on `function_id`

### Delete semantics

- Delete function → reject if custom APIs still reference it (**409** / clear error), or cascade-delete custom APIs — **prefer reject** so Studio shows dependents.
- Delete custom API → row only; function remains.

## Port surface (proposed)

```
listFunctions() / getFunction(id) / getFunctionBySlug(slug)
insertFunction / updateFunction / deleteFunction

listCustomApis() / getCustomApi(id) / getCustomApiByMethodSlug(method, slug)
insertCustomApi / updateCustomApi / deleteCustomApi
```

Handlers / HTTP dispatch live in `@altr/jord-server`, not the adapter.

## Tasks

- [x] Drizzle schema modules + migrate
- [x] Port methods + `LibSqlAdapter` impl
- [x] Unit tests (insert function → bind custom → list → update steps → delete guard)

## Done when

Temp `file:` DB has both tables; tests round-trip a function and a custom API without HTTP.
