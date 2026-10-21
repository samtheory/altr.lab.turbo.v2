---
title: "Jord-S0008 — Studio S6 custom + function APIs as-built"
description: "Built-in step pipelines, /x/:slug custom bindings, Studio editors, role gates"
created: 2026-10-21
updated: 2026-10-21
tags:
  - tech-space
  - jord
  - Jord-S0008
  - jord-studio
  - custom-api
  - function-api
---

# Jord-S0008 — Studio S6 custom + function APIs as-built

> Who: mimir / operators after S6. Plan: [[../../plan/Jord/Jord-S0008/README]] · Prior: [[06-s0007-jobs-logs]] · Generated API: [[05-s0006-generated-api]] · Intent: [[../../feature_list/Jord/03-jord-studio]].

## Contract

| Piece | Decision |
|-------|----------|
| User code | **No** eval / uploaded JS |
| Steps | Built-in: `echo`, `records_list`, `records_get`, `records_insert`, `records_count` |
| Custom dispatch | `METHOD /x/:slug` → function |
| Direct invoke | `POST /functions/:id/invoke` |
| Disable custom | **503** `{ error: "api_disabled", kind: "custom", id }` |
| Manage | `canManageApis` (admin) |
| Invoke | `canInvokeApis` (editor + admin); readonly **403** |
| Persistence | SQL `jord_functions` + `jord_custom_apis` |
| Delete function | **409** `has_dependents` if custom APIs still reference it |
| Env | Optional `JORD_CUSTOM_API_DISABLED` (comma ids/slugs) |

## Engine (`@altr/jord`)

| Piece | Role |
|-------|------|
| `schema/functions.ts` | Drizzle tables |
| `ensureFunctionsSchema` | Additive migrate on open |
| Port | CRUD + `getFunctionBySlug` / `getCustomApiByMethodSlug` / `deleteFunction` result |

## Server (`@altr/jord-server`)

| Module / route | Role |
|----------------|------|
| `functions/kinds.ts` + `runner.ts` | Step registry + fail-fast pipeline |
| `GET/POST /functions`, `PATCH/DELETE /functions/:id` | Manage CRUD |
| `POST /functions/:id/invoke` | Invoke (editor+) |
| `GET/POST /custom-apis`, `PATCH/DELETE /custom-apis/:id` | Manage CRUD |
| `ALL /x/:slug` | Custom dispatch |

Writes in steps use `enqueueWrite`.

## Studio (`apps/jord-studio`)

| Piece | Behavior |
|-------|----------|
| Nav **APIs → Function APIs** / **Custom APIs** | `live` |
| `FunctionsPanel` | Create, edit steps, enable, invoke, delete |
| `CustomApisPanel` | Bind method+slug→function, toggle, try-it, copy curl |
| BFF | `/api/functions*`, `/api/custom-apis*`, `/api/x/:slug` |

## Verify (2026-10-21)

- `pnpm --filter @altr/jord test` — 14 passed (incl. functions dependents)
- `pnpm --filter @altr/jord typecheck`
- `pnpm --filter @altr/jord-server test` — 19 passed (incl. custom invoke / 503 / role gates)
- `pnpm --filter @altr/jord-server typecheck`
- `pnpm --filter @altr/jord-studio typecheck`

## Out of this ship

Triggers/policies (S7), OpenAPI export, cron-of-functions, arbitrary SQL steps, Postgres functions.
