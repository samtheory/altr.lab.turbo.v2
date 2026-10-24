---
title: "S0021 Part A — migration foundation"
description: "jord_migrations + idempotent runner + baseline adopt of phase-01 tables"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0021
  - migrations
---

# Part A — migration foundation

> Sprint: [[README]]. **Implement first. Stop for review.**

## Status

**planned**

## Lock

| Piece | Choice |
|-------|--------|
| Table | `jord_migrations(id, name, checksum, applied_at)` |
| Runner | Ordered, idempotent, both dialects; replaces ad-hoc `CREATE TABLE IF NOT EXISTS` at boot |
| Baseline | One migration that adopts all existing phase-01 tables if present |
| Checksum | Fail loudly if an applied migration file changes |

## Done when

- [ ] Fresh DB applies full chain
- [ ] Existing phase-01 DB records baseline without destroying data
- [ ] Second boot applies nothing
- [ ] File libSQL tests green; Postgres opt-in if `JORD_TEST_POSTGRES_URL` set
