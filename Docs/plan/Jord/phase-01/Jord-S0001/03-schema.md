---
title: "Phase 3 — records schema"
description: "Drizzle records table: JSON scratchpad, 64-bit timestamps, version, bucket index"
created: 2026-10-18
updated: 2026-10-18
tags:
  - plan
  - jord
  - Jord-S0001
---

# Phase 3 — records schema

> Who: implementer. Writes that honor `version` are card 4.

Sprint index: [[README]] · Columns: [[../../../../feature_list/Jord/done/jord-F0001-overview]]

`records` is a JSON scratchpad. Do not add `orders`, `positions`, `trades`, or an embedding column.

## Columns

| Column | Drizzle | Notes |
|--------|---------|--------|
| `id` | `text` primary key | Set by the insert helper (card 4), not by SQLite |
| `bucket` | `text` not null | |
| `body` | `text` not null | JSON string |
| `metadata` | `text` | Null allowed |
| `created_at` | `integer({ mode: 'number' })` not null | Unix milliseconds |
| `updated_at` | `integer({ mode: 'number' })` not null | Unix milliseconds |
| `version` | `integer` not null default `1` | OCC. Integer mode may stay default; the value is a small counter, not a timestamp |

Index: `(bucket, created_at)`.

Apply with idempotent SQL on `createJordClient` (see sprint decision 3). Do not add drizzle-kit.

## Tasks

- [ ] Schema module in `@altr/jord`
- [ ] Open creates the table and index if missing
- [ ] Test: `PRAGMA table_info(records)` includes `version`, and the two timestamp columns are INTEGER (SQLite stores them as 64-bit)

## Done when

A fresh file has `records` and the composite index, and the Drizzle column for both timestamps uses `mode: 'number'`.
