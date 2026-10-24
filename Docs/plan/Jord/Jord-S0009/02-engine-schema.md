---
title: "Phase 2 — engine policies + triggers schema"
description: "Drizzle tables jord_policies / jord_triggers; migrate on open; port CRUD"
created: 2026-10-23
updated: 2026-10-23
tags:
  - plan
  - jord
  - Jord-S0009
---

# Phase 2 — engine policies + triggers schema

> Who: **sindri** · **saga** (schema / timestamps). Timestamps stay `integer({ mode: 'number' })` ms.

Sprint index: [[README]] · Contract: [[01-security-contract]] · Functions precedent: [[../Jord-S0008/02-engine-functions-schema]] · Slice 0 style: [[../../../tech_space/jord/00-s0001-slice0]]

## Status

**done** (2026-10-23)

## Tables

| Table | Purpose |
|-------|---------|
| `jord_policies` | Policy definitions + `rules` JSON |
| `jord_triggers` | Trigger definitions + `actions` JSON |

Migrate via `ensurePoliciesSchema(client)` / `ensureTriggersSchema(client)` (or one `ensureDatabaseFeaturesSchema`) from the same open path as jobs/functions — additive `CREATE TABLE IF NOT EXISTS` only.

### Indexes (proposed)

- `jord_policies_table_op_priority_idx` on `(table_name, operation, priority)`
- `jord_triggers_table_event_idx` on `(table_name, event)`
- Optional unique `(name)` per table family if Studio wants stable labels — not required

### Delete semantics

- Delete policy / trigger → row only
- `invoke_function` actions that reference a deleted function → trigger runs fail-soft + log (or validate on save → **400** if function missing) — **prefer validate on save**

## Port surface (proposed)

```
listPolicies() / getPolicy(id)
insertPolicy / updatePolicy / deletePolicy
listPoliciesFor(table, operation)  // enabled only, for evaluator

listTriggers() / getTrigger(id)
insertTrigger / updateTrigger / deleteTrigger
listTriggersFor(table, event)  // enabled only, for hooks
```

Policy evaluation and trigger execution live in `@altr/jord-server`, not the adapter.

## Optional dialect stub

```
compileTriggerSql?(def): string | null  // null on LibSqlAdapter for S7
```

Do not block S7 on implementing real SQL emit.

## Tasks

- [x] Drizzle schema modules + migrate
- [x] Port methods + `LibSqlAdapter` impl
- [x] Unit tests (insert policy → listFor → update rules → delete; same for triggers)

## Done when

Temp `file:` DB has both tables; tests round-trip a policy and a trigger without HTTP.
