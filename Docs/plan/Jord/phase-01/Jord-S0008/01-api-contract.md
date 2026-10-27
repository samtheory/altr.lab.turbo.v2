---
title: "Phase 1 — custom + function API contract"
description: "Custom routes, function steps, dispatch paths, roles — lock before code"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - jord
  - Jord-S0008
  - custom-api
  - function-api
---

# Phase 1 — custom + function API contract

> Who: **mimir** (scope) · **heimdall** (roles / invoke auth). Server and Studio implement against this note.

Sprint index: [[README]] · Intent: [[../../../../feature_list/Jord/done/jord-F0012-studio]] · Auth: [[../../../../tech_space/jord/auth]] · S4 catalog: [[../../../../tech_space/jord/apis]]

## Status

**done** (2026-10-21)

## Two surfaces (one pipeline)

| Surface | Meaning |
|---------|---------|
| **Function** | Named multi-step pipeline of **built-in** step kinds. Editable + live-save (PATCH persists). Invocable by id. |
| **Custom API** | Named HTTP binding: `method` + `slug` → calls one function. Enable/disable. Public path under a fixed prefix. |

Generated CRUD (`/apis/generated`, `/records*`) stays unchanged. Custom/function are **additive**.

## Safety (non-negotiable for S6)

| Rule | Choice |
|------|--------|
| User code | **No** `eval`, no uploaded JS, no WASM sandbox |
| Steps | **Built-in registry only** (string `kind` → handler), same spirit as S5 job kinds |
| Writes | Hot mutations still go through `enqueueWrite` |
| Secrets | Do not log Authorization or full bodies on invoke |

## Function model

| Field | Notes |
|-------|-------|
| `id` | UUID |
| `name` | Display label |
| `slug` | Unique kebab/snake for invoke path |
| `description` | Optional TEXT |
| `steps` | JSON array of `{ kind, config }` (ordered) |
| `enabled` | Soft off without delete |
| `created_at` / `updated_at` | ms integers |

### Required step kinds (S6)

| Kind | Behavior |
|------|----------|
| `echo` | Return `{ message }` from config / merge request body |
| `records_list` | List `records` (config: `limit`, optional `bucket`) |
| `records_get` | Get one record; id from `config.id` or request `params.id` / body |
| `records_insert` | Insert record from request body (write role on invoke) |

Optional if cheap: `records_count` (reuse S5 semantics).

Pipeline semantics: run steps in order; each step receives `{ request, prior }` and returns a JSON-serializable result; final HTTP body = last step result (or documented wrap). Fail-fast on first error → **4xx/5xx** with `{ error, stepIndex, kind }`.

## Custom API model

| Field | Notes |
|-------|-------|
| `id` | UUID |
| `name` | Display label |
| `method` | `GET` \| `POST` \| `PATCH` \| `DELETE` |
| `slug` | Path segment only (no `/`); unique per method |
| `function_id` | FK → function |
| `enabled` | Disabled → **503** `{ error: "api_disabled", kind: "custom", id }` (mirror S4) |
| `created_at` / `updated_at` | ms |

### Dispatch path (locked)

| Pattern | Example |
|---------|---------|
| Custom invoke | `METHOD /x/:slug` |
| Function invoke (Studio / lab) | `POST /functions/:id/invoke` with optional JSON body |

`/x/*` is **not** part of the generated catalog. Schema / jobs / auth routes stay reserved; reject custom slugs that collide with reserved first segments (`records`, `schema`, `apis`, `jobs`, `logs`, `auth`, `health`, `functions`, `x` is the mount — slug is under it).

## Roles

Reuse **`canManageApis`** (admin) for create / update / delete / enable of functions and custom APIs. Do **not** invent a second capability unless a gap appears in verify.

| Action | readonly | editor | admin |
|--------|----------|--------|-------|
| List / get functions + custom APIs | yes | yes | yes |
| Create / update / delete / enable | no | no | yes |
| `POST /functions/:id/invoke` | no* | yes** | yes |
| `METHOD /x/:slug` (enabled) | no* | yes** | yes |

\* readonly: **no** invoke in S6 (avoids write steps leaking).  
\*\* editor: invoke allowed; write steps (`records_insert`) still require write capability — if editor lacks write, that step returns **403** mid-pipeline (document in Studio).

## Live save

Studio editors **PATCH** on blur / Save (explicit button OK). No “export SQL only.” Persistence = SQL rows via port, not process-local Map (unlike S4 generated toggle registry — custom/function are durable).

## Env (lab)

| Var | Role |
|-----|------|
| Existing auth | Unchanged |
| Optional `JORD_CUSTOM_API_DISABLED` | Boot seed: comma custom API ids or slugs disabled |

## Out of contract (defer)

- Cron / schedule of functions (use S5 jobs later if needed)
- OpenAPI export
- Per-step role overrides UI
- Arbitrary SQL step / Postgres functions
- Triggers & policies (S7)
- Hot-reload of Node modules / edge runtimes

## Tasks

- [x] Lock `/x/:slug` + `POST /functions/:id/invoke`
- [x] Lock built-in step kinds list
- [x] Lock disable → **503** for custom
- [x] Lock manage = `canManageApis`; readonly cannot invoke

## Done when

Implementers can build schema + dispatcher + Studio without inventing user-JS runtimes or a second auth model.

