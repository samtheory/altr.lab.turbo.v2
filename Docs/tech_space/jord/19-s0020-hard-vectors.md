---
title: "Jord-S0020 — hard vectors (as-built)"
description: "libSQL vector_distance_cos plus optional pgvector; cosine remains the fallback"
created: 2026-10-24
updated: 2026-10-24
tags:
  - tech-space
  - jord
  - Jord-S0020
  - vectors
  - pgvector
  - libsql
---

# Jord-S0020 — hard vectors (as-built)

> Who: anyone changing embedding search. Plan: [[../../plan/Jord/Jord-S0020/README]]. Prior lab path: [[13-s0014-vectors]].

## What shipped

| Layer | Change |
|-------|--------|
| `@altr/jord` | `vectorBackend` on `JordDriverPort`. Helpers in `vectors/hard.ts` |
| libSQL | Probe `vector_distance_cos`. Exact engine KNN when a namespace has ≤ 200 rows. Above that, per-namespace `F32_BLOB` shadow + `libsql_vector_idx` / `vector_top_k`, then rescore |
| Postgres | Best-effort `CREATE EXTENSION vector`, column `embedding_vec vector(1536)`, HNSW index when create succeeds. Search uses `<=>`. Zero-pad preserves cosine |
| Fallback | Probe or SQL failure keeps open alive and ranks with in-process cosine. The search result `backend` is `cosine` in that case |
| Server | `/health.vectorBackend`. Namespace list and search JSON include `backend` |
| Studio | Connection and Vectors badges (`Badge` from `@altr/apolyx`) |

`sqlite-vec` (`vec0`) is **not** loaded. `@libsql/client` 0.15 on this tree returns `vector_distance_cos(...) = 0` for identical vectors and `no such function: vec_version`. The hard libSQL path is the engine that already ships in the client.

## Index name

DiskANN rejects `-` in the index name (`unable to initialize diskann`). The shadow **table** may be quoted with the namespace hyphen (`"jord_vix_lab-notes"`). The **index** encodes `-` as `__` (`jord_vix_lab__notes_idx`), which does not collide with a namespace that already used `_`.

## HTTP

| Field | Where |
|-------|--------|
| `vectorBackend` | `GET /health` — capability probed at open |
| `backend` | `GET /vectors/namespaces` and `POST /vectors/:namespace/search` |

Values: `libsql-vector` \| `pgvector` \| `cosine`. No connection string and no token.

## Verify

- `pnpm --filter @altr/jord test` — `vectors/hard.test.ts`, `vectors/embeddings.test.ts` (shadow row counts for `lab` and `lab-notes`)
- `pnpm --filter @altr/jord-server test` — health includes `vectorBackend`; vector search still ranks the nearer id
- Postgres live: `JORD_TEST_POSTGRES_URL` — skipped unless set

## Not in this ship

Hosted embed APIs · embedding CDC · requiring `pgvector` or the libSQL vector functions for a green test run · a single mixed-dimension `libsql_vector_idx` on `jord_embeddings` (the column is a plain BLOB; the engine rejected that index).
