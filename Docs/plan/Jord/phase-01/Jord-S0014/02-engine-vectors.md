---
title: "Phase 2 — engine vectors on JordDriverPort"
description: "DDL, Float32 pack/unpack, upsert/search/delete both adapters"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0014
  - vectors
  - engine
---

# Phase 2 — engine vectors on JordDriverPort

> Who: **saga** / **sindri**.

Sprint: [[README]] · Contract: [[01-contract]]

## Status

**done** (2026-10-24)

## Work

| Piece | Notes |
|-------|--------|
| Migrate | `ensureBlobs`-style `ensureEmbeddingsSchema` on libSQL + Postgres |
| Helpers | `packF32` / `unpackF32` / `cosineSimilarity` in `@altr/jord` |
| Port | `listVectorNamespaces`, `listEmbeddings`, `upsertEmbedding`, `getEmbedding`, `deleteEmbedding`, `searchVectors` |
| libSQL | Load sqlite-vec if available; else cosine loop in JS |
| Postgres | Cosine in SQL (`<=>` only if pgvector detected) or JS fallback |
| Tests | Pack/unpack, upsert, search ranking, dim mismatch |

## Done when

- [ ] Both adapters implement the port methods
- [ ] Unit tests prove nearest neighbor order for a tiny fixture
- [ ] No Studio import of disk/DB packages
