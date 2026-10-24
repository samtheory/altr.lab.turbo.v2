---
title: "Phase 2 — engine hard vectors"
description: "Probe, shadow index, pgvector column, search ranking"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0020
  - vectors
---

# Phase 2 — engine hard vectors

> Who: **sindri**. Sprint: [[README]] · Contract: [[01-contract]].

## Status

**done** (2026-10-24)

## Work

| Piece | Result |
|-------|--------|
| Probe | libSQL `vector_distance_cos(vector32(...))`; Postgres `CREATE EXTENSION IF NOT EXISTS vector` |
| libSQL search | Exact distance ≤ 200 rows; `vector_top_k` above that, then rescore |
| Shadow | Written on upsert/delete. Hyphen namespaces keep a quoted table and a hyphen-free index |
| Postgres | Dual-write `embedding_vec`. Backfill nulls before `<=>` search |
| Fallback | SQL errors fall through to `rankByCosine` and report `backend: "cosine"` |

## Done when

- [x] File client reports `libsql-vector` and ranks the nearer vector first
- [x] `jord_vix_lab-notes` row is indexed under `jord_vix_lab__notes_idx`
