---
title: "Jord phase-02 — remaining backlog"
description: "Unnumbered leftovers after phase-01; promote into phase-02 sprint folders only when needed"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - backlog
  - phase-02
---

# Jord phase-02 — remaining backlog

> Who: **mimir** if a product need promotes a row. Intent: [[../../../feature_list/Jord/01-phase-02-candidates]]. Phase hub: [[../README]] · This phase: [[README]]. Shipped review: [[../../../report/Jord-implemented-review]].

**Last closed (phase-01):** [[../phase-01/Jord-S0020/README|Jord-S0020]] — hard vectors · as-built [[../../../tech_space/jord/vectors]].  
**Numbered queue:** empty. New cards go under `plan/Jord/phase-02/`.

Rows below are **not** sprints until promoted. Artemis is a product fork, not a Jord sprint.

## Not numbered (promote only if needed)

| Item | Source | Notes |
|------|--------|-------|
| Blob enhancements: multipart, larger limits, remote S3 | S0013 deferred | |
| Redis-compatible cache | phase-02 candidates | When live state needs it |
| Bot / second cloud process | phase-02 candidates | When the in-process writer is the wrong shape |
| Hosted embed API · embedding CDC | S0014 / S0020 deferred | Search engines shipped; callers still supply floats |

## Explicitly not Jord sprint cards

| Item | Home |
|------|------|
| Artemis trading domain / terminal | Product fork — [[../../../idea/artemis/README]] |
| Tia map engine | [[../../../feature_list/tia/README]] |
| Apolyx kit carryovers | [[../../../feature_list/ui-kit/01-apolyx-s0001-carryovers]] |
| CI pipeline / npm publish | Lab infra |

## Carryovers already deferred inside phase-01 ships

- S0009 — native SQL triggers on Postgres; column-level policies
- S0010 — Studio URL editor; migrate file→Postgres wizard
- S0011 / S0018 — true SQLite update hooks / PG LISTEN
- S0012 — OCC editor for arbitrary tables
- S0013 — full S3 / SigV4 / remote object store; blob CDC
- S0014 / S0020 — hosted embed API; embedding CDC. Engine distance and `pgvector` **shipped**; cosine remains the fallback when the engine lacks them
- S0017 — non-`records` RLS; drop middleware on Postgres
- S0019 — embedded replicas; file→Turso wizard; Studio paste-URL UI

## Rule

**Do not invent a sprint id from this list automatically.** Promote one row into `Docs/plan/Jord/phase-02/<card>/` only when the product needs it. Artemis stays a product track.
