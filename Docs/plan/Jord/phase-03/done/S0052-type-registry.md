---
title: "S0052 — dialect type registry + introspection model"
description: "One dialect-aware type registry (libSQL + Postgres) that both DDL and introspection use, replacing the thin hardcoded type list"
created: 2026-10-28
updated: 2026-11-02
tags:
  - plan
  - jord
  - phase-03
  - task
  - S0052
  - done
---

# S0052 — dialect type registry + introspection model

> **Status:** **done** 2026-11-02 · **Phase:** [[../README]] · Parent: [[../../../../feature_list/Jord/todo/jord-F0024-column-model-v2|jord-F0024]] · After ship: [[../../../../tech_space/jord/schema/README]]

## Routing (who / how long / which model)

| | |
|--|--|
| **Suggested agent** | mimir → **saga** |
| **Companion skills** | `.agents/skills/supabase-postgres-best-practices/` · `.agents/skills/graft/` |
| **Suggested model** | `claude-sonnet-5-5-high` — type mapping is where silent corruption hides |
| **Est. time** | **2–3 h** |
| **Parallel?** | **No** — S0053/S0054 depend on the registry |

## Goal

`elements/jord/src/schema/types/` exports a registry: for each logical type family → the DDL fragment per dialect, the read/write codec, the UI metadata (label, params, validation hints), and the reverse mapping used by introspection. Unknown legacy types map to a read-only `{ kind: 'custom', raw }` instead of being coerced.

## Done when

- [x] Every type in the F0024 tables round-trips unchanged on its dialect
- [x] Unsupported Postgres type appears as `custom` read-only, not coerced
- [x] One mapping source (no duplicate table in migrate-type-map)
- [x] Proof pasted

## Proof

| Date | Command | Result |
|------|---------|--------|
| 2026-11-02 | `pnpm --filter @altr/jord test` | 115 passed · 12 skipped · exit 0 (includes `src/schema/types/registry.test.ts`) |

## After ship

| Update | Path |
|--------|------|
| tech_space | `Docs/tech_space/jord/schema/README.md` |
| Queue | [[../README]] |
