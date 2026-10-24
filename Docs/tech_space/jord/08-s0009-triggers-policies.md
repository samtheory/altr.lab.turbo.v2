---
title: "Jord-S0009 — Studio S7 triggers + policies as-built"
description: "libSQL policy middleware, AFTER write triggers, Studio Database panels"
created: 2026-10-23
updated: 2026-10-23
tags:
  - tech-space
  - jord
  - Jord-S0009
  - jord-studio
  - policies
  - triggers
---

# Jord-S0009 — Studio S7 triggers + policies as-built

> Who: mimir / operators after S7. Plan: [[../../plan/Jord/Jord-S0009/README]] · Prior: [[07-s0008-custom-function-apis]] · Auth: [[04-s0005-auth]] · Intent: [[../../feature_list/Jord/03-jord-studio]].

## Contract

| Piece | Decision |
|-------|----------|
| User SQL / code | **No** free SQL, no eval |
| Policy rules | Built-in: `role_in`, `bucket_in`, `bucket_eq`, `always` |
| Trigger actions | Built-in: `log`, `echo`, `invoke_function` |
| Evaluation | Priority desc; deny before allow at equal priority; **default allow** if none match |
| Deny response | **403** `{ error: "policy_denied", policyId, table, operation }` |
| Manage | `canAlterSchema` (admin) |
| Table scope v1 | `records` only |
| Triggers | AFTER hooks on server write path (not native `CREATE TRIGGER`) |
| Fail-soft | Trigger errors log; do not roll back the write (unless `failHard: true`) |
| Env | `JORD_POLICIES_DISABLED`, `JORD_TRIGGERS_DISABLED` |
| Dialect stub | `compileTriggerSql` → `null` on LibSqlAdapter |

## Engine (`@altr/jord`)

| Piece | Role |
|-------|------|
| `schema/policies.ts` / `schema/triggers.ts` | Drizzle tables |
| `ensurePoliciesSchema` / `ensureTriggersSchema` | Additive migrate on open |
| Port | CRUD + `listPoliciesFor` / `listTriggersFor` |

## Server (`@altr/jord-server`)

| Module / route | Role |
|----------------|------|
| `policies/kinds.ts` + `evaluate.ts` | Rule matchers + decision |
| `triggers/kinds.ts` + `runner.ts` | Action runner + AFTER fire |
| `/records*` | Policy gate + trigger hooks |
| Function `records_*` steps | Same policy gate; insert fires triggers when `logs` passed |
| `GET/POST /policies`, `PATCH/DELETE /policies/:id` | Manage CRUD |
| `GET/POST /triggers`, `PATCH/DELETE /triggers/:id` | Manage CRUD |
| Log source | `trigger` added to `LogRing` |

## Studio (`apps/jord-studio`)

| Piece | Behavior |
|-------|----------|
| Nav **Database → Policies** / **Triggers** | `live` |
| `PoliciesPanel` | Create, edit rules JSON, enable, delete |
| `TriggersPanel` | Create, edit actions JSON, enable, delete |
| BFF | `/api/policies*`, `/api/triggers*` |

## Verify (2026-10-23)

- `pnpm --filter @altr/jord test` — 15 passed (incl. policies/triggers)
- `pnpm --filter @altr/jord typecheck`
- `pnpm --filter @altr/jord-server test` — 20 passed (incl. policy deny + trigger log + editor 403 manage)
- `pnpm --filter @altr/jord-server typecheck`
- `pnpm --filter @altr/jord-studio typecheck`

## Out of this ship

Postgres RLS / `CREATE POLICY`, native SQLite `CREATE TRIGGER`, non-`records` tables, BEFORE triggers, realtime fan-out (S9).
