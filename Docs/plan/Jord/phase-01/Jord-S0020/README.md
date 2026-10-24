---
title: "Jord-S0020 — hard vectors"
description: "Done: libSQL engine vectors and optional pgvector; cosine stays the fallback"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0020
  - vectors
  - pgvector
  - libsql
---

# Jord-S0020 — hard vectors

> Who: **mimir**. **Status: done (2026-10-24).** Prior: [[../Jord-S0019/README]]. As-built: [[../../../../tech_space/jord/vectors]]. This is the **last numbered** Jord sprint. Backlog: [[../../phase-02/00-remaining-backlog]].

**Sprint id:** `Jord-S0020`  
**Opened:** 2026-10-24 · **Closed:** 2026-10-24 · **Owner:** mimir  
**Hats:** **sindri** · **saga** · **apollo** · **docs_man**

## Design lock (v1) — shipped

| Piece | Choice |
|-------|--------|
| libSQL | Built-in `vector_distance_cos` / `vector32`. Per-namespace `F32_BLOB(n)` shadow + `libsql_vector_idx` |
| sqlite-vec | Not loaded. This `@libsql/client` has no `vec0` / `vec_version()` |
| Postgres | `CREATE EXTENSION vector` when the server allows it; `vector(1536)` + `<=>`; HNSW when create succeeds |
| Fallback | In-process cosine on the Float32 blob. Search `backend` says which path ran |
| ANN cutoff | libSQL exact engine distance at or below 200 rows in the namespace; `vector_top_k` above that |
| Dims | Still 8–1536, fixed per namespace. pgvector column is zero-padded to 1536 (cosine unchanged) |
| Secrets | No embed API keys. `/health` adds `vectorBackend` only |

## Phases

| # | Card | Hat | Status |
|---|------|-----|--------|
| 1 | [[01-contract]] | mimir / saga | **done** |
| 2 | [[02-engine]] | sindri | **done** |
| 3 | [[03-surfaces]] | sindri / apollo | **done** |
| 4 | [[04-verify]] | mimir → docs_man | **done** |

## Definition of done

- [x] File libSQL search uses engine distance when `vector_distance_cos` exists
- [x] Shadow index name has no `-` (DiskANN rejects hyphenated index names)
- [x] Postgres uses `<=>` when `pgvector` loads; otherwise cosine
- [x] `/health` and `/vectors/*` report `libsql-vector` \| `pgvector` \| `cosine`
- [x] Studio Connection + Vectors show that label (Apolyx `Badge`)
- [x] Unit tests; Postgres live test stays gated
- [x] Numbered queue is empty after this card

## Explicitly out

Hosted embed APIs · embedding CDC · forcing the extension (cosine remains valid) · Redis · Artemis

