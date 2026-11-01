---
title: "jord-F0003 — writes"
feature_id: jord-F0003
description: "Shipped: write queue (PG width via JORD_PG_WRITE_CONCURRENCY), OCC records, user-table row writes"
created: 2026-10-18
updated: 2026-11-01
tags:
  - feature
  - jord
  - done
  - writes
  - s0038
---

# jord-F0003 — writes

> Hot-path writes and OCC. As-built: [[../../../tech_space/jord/writes/README]]. Related: [[jord-F0002-dialects]] · [[jord-F0001-overview]].

## Write queue

libSQL hot writes stay serial in `@altr/jord-server`. Postgres uses the same queue with width from `JORD_PG_WRITE_CONCURRENCY` (1…8, default 1) — [[../../../plan/Jord/phase-03/done/S0038-pg-write-concurrency|S0038]] / [[jord-F0013-production-ops|jord-F0013]]. SQL **reads** use a different connection.

Do not open the raw DB file from many OS processes for hot writes.

## `records` OCC

| Column | Notes |
|--------|--------|
| `id` | text PK |
| `bucket` | app namespace |
| `body` | JSON text (scratchpad — not trading entities) |
| `metadata` | optional JSON |
| `created_at` / `updated_at` | Unix ms, 64-bit-safe integers |
| `version` | optimistic concurrency; default 1 |

Mutation: `version = version + 1` only `WHERE id = ? AND version = ?`. No match → HTTP **409**. Index `(bucket, created_at)`.

## User tables

Row writes beyond `records` shipped (S0015). Plan: [[../../../plan/Jord/phase-01/Jord-S0015/README|S0015]] · Slice 0 [[../../../plan/Jord/phase-01/Jord-S0001/README|S0001]].
