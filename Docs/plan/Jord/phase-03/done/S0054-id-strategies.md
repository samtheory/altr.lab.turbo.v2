---
title: "S0054 — generated id strategies"
description: "Identity, serial, sequence, uuid v4/v7, ULID, nanoid, cuid2 with unique-under-concurrency guarantees on both dialects"
created: 2026-10-28
updated: 2026-11-02
tags:
  - plan
  - jord
  - phase-03
  - task
  - S0054
  - done
---

# S0054 — generated id strategies

> **Status:** **done** 2026-11-02 · **Depends on** [[S0052-type-registry|S0052]] · [[S0053-column-settings|S0053]] · **Phase:** [[../README]] · Parent: [[../../../../feature_list/Jord/todo/jord-F0024-column-model-v2|jord-F0024]] · After ship: [[../../../../tech_space/jord/schema/README]]

## Routing (who / how long / which model)

| | |
|--|--|
| **Suggested agent** | mimir → **saga** |
| **Companion skills** | `.agents/skills/supabase-postgres-best-practices/` · `.agents/skills/graft/` |
| **Suggested model** | `gpt-5.6-sol-medium` |
| **Est. time** | **1.5–2 h** |
| **Parallel?** | **No** |

## Goal

A column can declare how its id is generated: identity always / by default, serial, sequence, uuid v4, uuid v7, ULID, nanoid, cuid2, or a custom default. Generation happens where the value is created (DDL default or write path) and is unique under concurrent inserts.

## Done when

- [x] Every strategy works on its supported dialect and is documented as unsupported where it is
- [x] 50 parallel inserts → 50 unique ids (test)
- [x] No implicit change for tables without a strategy
- [x] Proof pasted

## Proof

| Date | Command | Result |
|------|---------|--------|
| 2026-11-02 | `pnpm --filter @altr/jord test` | **125 passed** · 12 skipped · exit 0 (`id-strategy.test.ts` concurrency) |

## After ship

| Update | Path |
|--------|------|
| tech_space | `Docs/tech_space/jord/schema/README.md` |
| Queue | [[../README]] |
