---
title: "Phase 1 — hard vector contract"
description: "Backend labels, libSQL engine vectors, pgvector column, cosine fallback"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0020
  - vectors
---

# Phase 1 — hard vector contract

> Who: **mimir** / **saga**. Sprint: [[README]].

## Status

**done** (2026-10-24)

## Lock

| Piece | Choice |
|-------|--------|
| `vectorBackend` | `libsql-vector` \| `pgvector` \| `cosine` on the port and on each successful search |
| Blob column | Stays Float32 LE. Source of truth for cosine and for libSQL `vector_distance_cos` |
| libSQL index | Shadow table `jord_vix_<namespace>` as `F32_BLOB(dims)`. Index name encodes `-` as `__` |
| pgvector | Nullable `embedding_vec vector(1536)`, zero-padded. Score is `1 - (embedding <=> query)` |
| Missing engine | Probe failure does not fail open. Search stays cosine |

## Done when

- [x] Contract matches the as-built note
