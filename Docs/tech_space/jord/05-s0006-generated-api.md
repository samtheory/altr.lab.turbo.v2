---
title: "Jord-S0006 — Studio S4 generated API as-built"
description: "Catalog + enable/disable for records CRUD; DELETE verb; Studio Generated API panel"
created: 2026-10-21
updated: 2026-10-21
tags:
  - tech-space
  - jord
  - Jord-S0006
  - jord-studio
  - generated-api
---

# Jord-S0006 — Studio S4 generated API as-built

> Who: mimir / operators after S4. Plan: [[../../plan/Jord/Jord-S0006/README]] · Prior auth: [[04-s0005-auth]] · Intent: [[../../feature_list/Jord/03-jord-studio]].

## Contract

| Piece | Decision |
|-------|----------|
| Resource in scope | `records` only |
| Disable HTTP | **503** `{ error: "api_disabled", resource }` |
| Catalog read | Any authenticated role |
| Toggle | **admin** only (`canManageApis`) |
| Registry | In-process Map; seed via `JORD_GENERATED_API_DISABLED` (comma ids) |
| Schema routes | Not part of generated catalog; always available when authed |

## Server (`cloud/jord`)

| Module / route | Role |
|----------------|------|
| `src/generated-api/registry.ts` | Enable/disable Map |
| `src/generated-api/catalog.ts` | Static ops descriptor for `records` |
| `GET /apis/generated` | Full catalog |
| `GET /apis/generated/:resource` | One resource |
| `PATCH /apis/generated/:resource` | `{ enabled: boolean }` — admin |
| `DELETE /records/:id` | Write role; queued hard delete |
| `/records*` | Guarded by generated-api enable flag |

Engine: `JordDriverPort.deleteRecord(id)` on `LibSqlAdapter`.

## Studio (`apps/jord-studio`)

| Piece | Behavior |
|-------|----------|
| Nav **APIs → Generated API** | `live` → `/apis/generated` |
| `GeneratedApiPanel` | Resource list, ops table, copy curl (BFF), try-it, admin Switch |
| BFF | `/api/apis/generated`, `/api/apis/generated/:resource`, `DELETE /api/records/:id` |
| Help | Lists manage-API capability |

## Verify (2026-10-21)

- `pnpm --filter @altr/jord test` — 12 passed (incl. deleteRecord)
- `pnpm --filter @altr/jord typecheck`
- `pnpm --filter @altr/jord-server test` — 17 passed (catalog, toggle 403/503, DELETE)
- `pnpm --filter @altr/jord-server typecheck`
- `pnpm --filter @altr/jord-studio typecheck`

## Out of this ship

Custom / function APIs (S6), OpenAPI file export, jobs/logs (S5), per-operation toggles.
