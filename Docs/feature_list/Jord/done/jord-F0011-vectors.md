---
title: "jord-F0011 — vectors"
feature_id: jord-F0011
description: "Shipped: caller-supplied embeddings, cosine / libSQL engine / pgvector"
created: 2026-10-24
updated: 2026-10-27
tags:
  - feature
  - jord
  - done
  - vectors
---

# jord-F0011 — vectors

> Embeddings search. As-built: [[../../../tech_space/jord/vectors/README]]. Hosted embed API stays out (soft / todo).

| Capability | Status | Plan |
|------------|--------|------|
| Upsert / search (caller floats) | **Done** | [[../../../plan/Jord/phase-01/Jord-S0014/README\|S0014]] |
| Engine ranking (libSQL cos / pgvector) | **Done** | [[../../../plan/Jord/phase-01/Jord-S0020/README\|S0020]] |

Invariant: Jord does **not** call a hosted embed API. Dialect seam: `searchVectors` on [[dialects|JordDriverPort]].
