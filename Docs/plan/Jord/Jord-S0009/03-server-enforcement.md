---
title: "Phase 3 — server policy middleware + trigger hooks"
description: "Rule evaluator, records gate, AFTER write triggers, manage CRUD routes"
created: 2026-10-23
updated: 2026-10-23
tags:
  - plan
  - jord
  - Jord-S0009
  - policies
  - triggers
---

# Phase 3 — server policy middleware + trigger hooks

> Who: **sindri** · **heimdall** (403 shape / deny tests). Writes through `enqueueWrite`. Trigger side-effects fail-soft by default; log via S5 ring.

Sprint index: [[README]] · Contract: [[01-security-contract]] · Engine: [[02-engine-schema]] · Auth: [[../../../tech_space/jord/04-s0005-auth]] · Functions runner: [[../../../tech_space/jord/07-s0008-custom-function-apis]]

## Status

**done** (2026-10-23)

## Modules (proposed under `cloud/jord/src/`)

| Module | Role |
|--------|------|
| `policies/kinds.ts` | Built-in rule matchers |
| `policies/evaluate.ts` | Load + sort + decide allow/deny |
| `policies/gate.ts` | Shared gate used by records + function steps |
| `policies/routes.ts` | CRUD for policies |
| `triggers/kinds.ts` | Built-in action handlers |
| `triggers/runner.ts` | Run ordered actions after write |
| `triggers/hooks.ts` | Wire into records mutate success path |
| `triggers/routes.ts` | CRUD for triggers |

## HTTP sketch

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/policies` | read |
| `POST` | `/policies` | alter schema |
| `GET` | `/policies/:id` | read |
| `PATCH` | `/policies/:id` | alter schema |
| `DELETE` | `/policies/:id` | alter schema |
| `GET` | `/triggers` | read |
| `POST` | `/triggers` | alter schema |
| `GET` | `/triggers/:id` | read |
| `PATCH` | `/triggers/:id` | alter schema |
| `DELETE` | `/triggers/:id` | alter schema |

Existing `/records*` and function steps call the policy gate — no new public “evaluate” route required.

## Seed (optional)

- One enabled policy: `allow` `select` on `records` with `role_in: [admin, editor, readonly]` + `always` — documents the model without locking the lab
- Prefer **no** deny-all seed
- One disabled trigger with `log` action for Studio demos — optional

## Wire points

1. After auth on records list/get/insert/patch/delete → `assertPolicy(ctx)`
2. Inside S6 step kinds that read/write `records` → same gate with step context
3. After successful records insert/update/delete in the write path → `runTriggers({ table, event, row, prior })`

Honor `JORD_POLICIES_DISABLED` / `JORD_TRIGGERS_DISABLED`.

## Tasks

- [x] Rule registry + evaluator + 403 body
- [x] Action registry + AFTER hooks
- [x] CRUD routes + enable flag
- [x] Wire into `createJordApp` + records / function paths
- [x] Integration tests (deny → 403; trigger log fires after insert; disabled skipped)

## Done when

A deny policy blocks `/records` for a matching role; an enabled AFTER insert trigger appends a log (or invokes echo function) without rolling back the insert when fail-soft.
