---
title: "S0053 — column settings + server-side validation"
description: "Nullability, defaults, unique/PK, check expressions, min/max/regex/length rules enforced on write and mirrored in Studio"
created: 2026-10-28
updated: 2026-11-02
tags:
  - plan
  - jord
  - phase-03
  - task
  - S0053
  - done
---

# S0053 — column settings + server-side validation

> **Status:** **done** 2026-11-02 · **Depends on** [[S0052-type-registry|S0052]] · **Phase:** [[../README]] · Parent: [[../../../../feature_list/Jord/todo/jord-F0024-column-model-v2|jord-F0024]] · After ship: [[../../../../tech_space/jord/schema/README]]

## Routing (who / how long / which model)

| | |
|--|--|
| **Suggested agent** | mimir → **saga** (model/DDL) + **sindri** (write path) |
| **Companion skills** | `.agents/skills/supabase-postgres-best-practices/` · `.agents/skills/graft/` |
| **Suggested model** | `claude-sonnet-5-5-high` |
| **Est. time** | **2.5–3 h** |
| **Parallel?** | **No** |

## Goal

Column metadata grows to: nullable/NOT NULL (explicit at create), default (literal / expression / `now()` / `gen_random_uuid()` / none), unique, primary key, auto-update timestamp, check expression, collation, comment — plus validation rules (min/max, length range, regex, enum values, date bounds) enforced **server-side on write** and surfaced as field-level errors.

## Done when

- [x] Every setting persists and round-trips through introspection
- [x] A direct API write that violates a rule gets 422 with the field name
- [x] Studio form shows the same message
- [x] Unsafe DDL needs an explicit confirm
- [x] Proof pasted

## Proof

| Date | Command | Result |
|------|---------|--------|
| 2026-11-02 | `pnpm --filter @altr/jord test` | **122 passed** · 12 skipped · exit 0 (includes `column-settings*.test.ts` + round-trip) |
| 2026-11-02 | `pnpm --filter @altr/jord-server exec vitest run src/app.test.ts -t "schema DDL"` | exit 0 (confirm flag wired) |

## After ship

| Update | Path |
|--------|------|
| tech_space | `Docs/tech_space/jord/schema/README.md` |
| Queue | [[../README]] |
