---
title: "Phase 1 — vectors contract"
description: "Namespace, dims, storage shape, search API, limits"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0014
  - vectors
  - contract
---

# Phase 1 — vectors contract

> Who: **mimir** / **saga**. Implementers lock to this note.

Sprint: [[README]] · Architecture: [[../../../../feature_list/Jord/02-architecture]]

## Status

**done** (2026-10-24)

## Model (v1)

| Piece | Choice |
|-------|--------|
| Namespace | Short slug `[a-z0-9][a-z0-9_-]{0,62}` (same spirit as blob buckets) — e.g. `lab`, `artemis-notes` |
| Row | One embedding per `(namespace, id)` or `(namespace, ref_id)` — prefer explicit `id` PK + optional `ref_id` (points at `records.id` or free text) |
| Dims | Fixed per namespace after first write; mismatch → 400. Lab default allow 8–1536 |
| Metric | Cosine similarity (higher = closer). Document only; no L2 switch in v1 |
| Limit | Search `limit` clamp 1–50 (default 10) |

### `jord_embeddings` columns

| Column | Type | Notes |
|--------|------|--------|
| `id` | text PK | cuid2 / uuid |
| `namespace` | text not null | |
| `ref_id` | text nullable | Optional foreign logical id |
| `dims` | integer not null | |
| `embedding` | blob / bytea not null | Float32 little-endian packed |
| `metadata` | text nullable | JSON string |
| `created_at` / `updated_at` | integer/bigint ms | |

Index: `(namespace, updated_at)` · unique optional `(namespace, ref_id)` when ref_id set (v1 may skip unique and allow multi).

## HTTP

| Method | Path | Body / query |
|--------|------|----------------|
| `GET` | `/vectors/namespaces` | Distinct namespaces |
| `GET` | `/vectors/:namespace` | List meta (no full vectors): id, ref_id, dims, updated_at |
| `PUT` | `/vectors/:namespace/:id` | `{ embedding: number[], ref_id?, metadata? }` |
| `POST` | `/vectors/:namespace/search` | `{ embedding: number[], limit? }` → `{ hits: [...] }` |
| `DELETE` | `/vectors/:namespace/:id` | Remove row |

## Limits

| Limit | v1 |
|-------|-----|
| Max dims | 1536 |
| Max list page | 100 |
| Max stored rows / namespace (warn) | Soft; brute-force search documents O(n) |

## Done when

- [ ] Contract agreed; out-of-sprint on [[README]] accurate
