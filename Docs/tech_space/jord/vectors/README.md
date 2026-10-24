---
title: "Jord — vectors"
description: "Caller-supplied embeddings, cosine fallback, libSQL engine distance, and optional pgvector"
created: 2026-10-24
updated: 2026-10-24
tags:
  - tech-space
  - jord
  - vectors
---

# Jord — vectors

> Who: anyone searching embeddings. Health field: [[../dialects/README]]. Realtime does not emit embedding CDC.

## Why

Retrieval should work on a laptop file with no extension, and use the engine’s distance when libSQL or Postgres actually has it. Jord does not call an embed API — callers pass floats.

## What

Table `jord_embeddings` stores a Float32 little-endian blob. Dims are 8–1536 and fixed per namespace after the first write (`dims_mismatch` → **409**). Search `limit` defaults to 10, max 50. List is capped (`MAX_LIST_EMBEDDINGS` = 100).

`vectorBackend` is probed at open and returned on `GET /health`. Each search result includes `backend`:

| `backend` | When |
|-----------|------|
| `libsql-vector` | `vector_distance_cos` exists. Exact KNN at ≤ 200 rows in the namespace. Above that, a per-namespace `F32_BLOB` shadow plus `libsql_vector_idx` / `vector_top_k`, then a rescore |
| `pgvector` | `CREATE EXTENSION vector` succeeded. Column `embedding_vec vector(1536)`, HNSW when create works, search with `<=>`. Shorter vectors are zero-padded so cosine still matches |
| `cosine` | Probe or SQL failed. In-process rank. Open still succeeds |

`sqlite-vec` (`vec0`) is not loaded. Index names cannot contain `-` (DiskANN). The shadow **table** may be quoted with a hyphen (`"jord_vix_lab-notes"`). The **index** encodes `-` as `__` (`jord_vix_lab__notes_idx`).

| Method | Path | Role |
|--------|------|------|
| `GET` | `/vectors/namespaces` | authenticated |
| `GET` | `/vectors/:namespace` | authenticated |
| `POST` | `/vectors/:namespace/search` | authenticated `{ embedding, limit? }` |
| `PUT` | `/vectors/:namespace/:id` | editor+ `{ embedding, ref_id?, metadata? }` |
| `DELETE` | `/vectors/:namespace/:id` | editor+ |

## How

| Piece | Path |
|-------|------|
| Pack + cosine | `elements/jord/src/vectors/f32.ts`, `search.ts` |
| Engine paths | `elements/jord/src/vectors/hard.ts` |
| Routes | `cloud/jord` `/vectors/*` on the write queue for upserts |
| Studio | **Vectors** → `/vectors`; Connection and Vectors show a `Badge` |

## Example

```json
PUT /vectors/lab/note-1
{ "embedding": [1, 0, 0, 0, 0, 0, 0, 0] }

POST /vectors/lab/search
{ "embedding": [0.9, 0.1, 0, 0, 0, 0, 0, 0], "limit": 3 }
```

The nearer id ranks first. `backend` says which ranker ran. A second upsert with a different length returns **409**.

## Not in Jord yet

A hosted embed API, embedding CDC, a namespace wipe route, requiring pgvector for a green default test run.
