---
title: "S0055 — FK / relationship editor (schema.table.column targets)"
description: "Declare FKs in the column editor with cross-schema targets, composite keys, ON DELETE/UPDATE behavior and cardinality display"
created: 2026-10-28
updated: 2026-11-02
tags:
  - plan
  - jord
  - phase-03
  - task
  - S0055
  - done
---

# S0055 — FK / relationship editor

> **Status:** **done** 2026-11-02 · **Depends on** [[S0053-column-settings|S0053]] + [[S0050-schema-picker-ui|S0050]] · **Phase:** [[../README]] · Parent: [[../../../../feature_list/Jord/todo/jord-F0024-column-model-v2|jord-F0024]] · After ship: [[../../../../tech_space/jord/schema/README]]

## Routing (who / how long / which model)

| | |
|--|--|
| **Suggested agent** | mimir → **saga** (DDL) + **apollo** (picker UI) |
| **Companion skills** | `.agents/skills/supabase-postgres-best-practices/` · `.agents/skills/apollo/` |
| **Suggested model** | `claude-sonnet-5-5-high` |
| **Est. time** | **2.5–3 h** |
| **Parallel?** | **No** |

## Goal

A foreign key is declared as **schema + table + column**, with composite keys, `ON DELETE` / `ON UPDATE` (`cascade`, `set null`, `restrict`, `no action`), a searchable target picker that defaults to the active sidebar schema but can reach another one, and cardinality (1:1 · 1:N · M:N) derived from uniqueness.

## Done when

- [x] Cross-schema FK created and introspected correctly (Postgres path + SQL; libSQL rejects non-`main` with `fk_unsupported`)
- [x] Composite FK works on Postgres (`addForeignKey`); libSQL ALTER → clear `fk_unsupported` (not a silent no-op); CREATE/ADD COLUMN REFERENCES on libSQL
- [x] ON DELETE behavior verified by test (cascade + set null)
- [x] Picker defaults to the active schema and can reach another
- [x] Proof pasted

## Proof

| Date | Command | Result |
|------|---------|--------|
| 2026-11-02 | `pnpm --filter @altr/jord test` | **131 passed** · 12 skipped · exit 0 (`fk.test.ts` cascade / set null / refuse alter) |
| 2026-11-02 | `pnpm --filter @altr/jord exec tsc --noEmit` | exit 0 |
| 2026-11-02 | `pnpm --filter jord-studio exec tsc --noEmit` | exit 0 |

## After ship

| Update | Path |
|--------|------|
| tech_space | `Docs/tech_space/jord/schema/README.md` |
| Queue | [[../README]] |
