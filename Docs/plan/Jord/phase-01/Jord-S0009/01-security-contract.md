---
title: "Phase 1 — triggers + policies contract"
description: "Policy rules, trigger hooks, enforcement points, roles — lock before code"
created: 2026-10-23
updated: 2026-10-23
tags:
  - plan
  - jord
  - Jord-S0009
  - policies
  - triggers
  - security
---

# Phase 1 — triggers + policies contract

> Who: **mimir** (scope) · **heimdall** (enforcement / roles). Server and Studio implement against this note.

Sprint index: [[README]] · Intent S7: [[../../../../feature_list/Jord/03-jord-studio]] · Dialect seam: [[../../../../feature_list/Jord/02-architecture]] · Auth: [[../../../../tech_space/jord/auth]]

## Status

**done** (2026-10-23)

## Two surfaces (one Database chapter)

| Surface | Meaning |
|---------|---------|
| **Policy** | Named, durable access rule for a **table** + **operation**. Evaluated in `@altr/jord-server` before the operation runs. |
| **Trigger** | Named, durable **AFTER** hook on a table write. Runs on the server after a successful mutation (same process as the write queue). |

Feature roles (`admin` / `editor` / `readonly`) stay as S3. Policies are **not** a fourth role — they refine what a signed-in caller may do on a table.

## Safety (non-negotiable for S7)

| Rule | Choice |
|------|--------|
| User SQL | **No** free-form SQL in Studio for policies or triggers |
| User code | **No** `eval`, uploaded JS, WASM |
| Policy rules | **Built-in rule kinds** only (string `kind` + JSON `config`) |
| Trigger actions | **Built-in action kinds** only (or invoke an existing `jord_functions` id) |
| Writes | Hot mutations still go through `enqueueWrite` |
| DB file | Browser never opens `data/jord.db` |

## Policy model

| Field | Notes |
|-------|-------|
| `id` | UUID |
| `name` | Display label |
| `table_name` | v1: `"records"` required (reject others with clear error; leave seam for later tables) |
| `operation` | `select` \| `insert` \| `update` \| `delete` |
| `effect` | `allow` \| `deny` |
| `rules` | JSON array of `{ kind, config }` — **all must match** (AND) for the rule set to apply |
| `priority` | Integer; higher wins when allow/deny conflict (document: deny-at-same-priority wins) |
| `enabled` | Soft off without delete |
| `created_at` / `updated_at` | ms integers |

### Required rule kinds (S7)

| Kind | Behavior |
|------|----------|
| `role_in` | Session role ∈ `config.roles: JordRole[]` |
| `bucket_in` | For `records`: row / filter bucket ∈ `config.buckets: string[]` (select/update/delete); insert body bucket must be in set |
| `bucket_eq` | Single bucket equality (`config.bucket`) |
| `always` | Always matches (use with effect for blanket allow/deny) |

### Evaluation (locked)

1. Load enabled policies for `(table_name, operation)`, sort by `priority` desc.
2. For each policy, if **all** rules match the request context → apply `effect`.
3. First decisive match wins; if none match → **default allow** for callers who already passed feature-role gates (policies refine; they do not replace S3).
4. Deny → HTTP **403** `{ error: "policy_denied", policyId, table, operation }`.

### Enforcement points (libSQL / Slice 0)

| Path family | Apply policies? |
|-------------|-----------------|
| `/records*` (list/get/insert/patch/delete) | **yes** |
| Generated CRUD that touches `records` | **yes** (same helpers as `/records*`) |
| Function steps that touch `records` (`records_list` / `get` / `insert`, …) | **yes** (evaluate inside step or shared gate) |
| `METHOD /x/:slug` | Indirect — only via function steps that touch tables |
| Schema / jobs / auth / health / manage routes | **no** (separate capabilities) |

## Trigger model

| Field | Notes |
|-------|-------|
| `id` | UUID |
| `name` | Display label |
| `table_name` | v1: `"records"` |
| `timing` | `after` only in S7 |
| `event` | `insert` \| `update` \| `delete` |
| `actions` | JSON array of `{ kind, config }` — run in order; fail-soft (log error, do not roll back the original write unless config says `failHard: true` — **default fail-soft**) |
| `enabled` | Soft off |
| `created_at` / `updated_at` | ms |

### Required action kinds (S7)

| Kind | Behavior |
|------|----------|
| `log` | Append summary to S5 log ring (`source: "trigger"`) |
| `invoke_function` | Run existing `jord_functions` by `config.functionId` with `{ event, row, prior }` payload (reuse S6 runner; no HTTP) |
| `echo` | No-op success with payload echo (lab / tests) |

### Runtime (locked for libSQL v1)

- **Application hooks** after successful `enqueueWrite` mutations on `records` — not browser, not SQLite `CREATE TRIGGER` as the primary path.
- Port may expose `compileTriggerSql(def)` as a **stub / TODO** for Postgres / future dialect emit ([[../../../../feature_list/Jord/02-architecture]]); S7 does not require native SQL triggers to pass verify.

## Roles

Reuse **`canAlterSchema`** (admin) for create / update / delete / enable of policies and triggers. Do **not** invent `canManagePolicies` unless verify proves a split is required.

| Action | readonly | editor | admin |
|--------|----------|--------|-------|
| List / get policies + triggers | yes | yes | yes |
| Create / update / delete / enable | no | no | yes |
| Subject to policy on `/records*` | yes | yes | yes* |

\* Admin is still evaluated by policies if an enabled deny matches; lab seed should not lock admins out of `records` by default.

## Live save

Studio editors **PATCH** on Save (explicit button OK). Persistence = SQL rows via port.

## Env (lab)

| Var | Role |
|-----|------|
| Existing auth | Unchanged |
| Optional `JORD_POLICIES_DISABLED=1` | Skip policy evaluation (dev escape hatch; log once at boot) |
| Optional `JORD_TRIGGERS_DISABLED=1` | Skip trigger hooks |

## Out of contract (defer)

- Postgres RLS compile / `CREATE POLICY` SQL
- Native SQLite `CREATE TRIGGER` as required path
- Policies on non-`records` tables
- BEFORE / INSTEAD OF triggers
- Column-level policies / JWT claim predicates beyond role + bucket
- Realtime fan-out of trigger events (S9)

## Tasks

- [x] Lock policy rule kinds + evaluation order + 403 shape
- [x] Lock trigger action kinds + AFTER write-path hooks
- [x] Lock manage = `canAlterSchema`; default allow when no policy matches
- [x] Lock v1 table scope = `records` only

## Done when

Implementers can build schema + middleware + hooks + Studio without inventing user-SQL or a second auth model.

