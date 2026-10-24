---
title: "Jord — remaining backlog (post S0020)"
description: "Numbered sprints S0001–S0020 are closed; leftover rows are not sprints"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - backlog
  - Jord-S0020
---

# Jord — remaining backlog

> Who: **mimir** if a product need promotes a row. Intent sources: [[../../feature_list/Jord/01-later]], [[../../feature_list/Jord/02-architecture]], [[../../feature_list/Jord/03-jord-studio]]. Shipped review: [[../../report/Jord-implemented-review]].

**Last closed:** [[Jord-S0020/README|Jord-S0020]] — hard vectors · as-built [[../../tech_space/jord/19-s0020-hard-vectors]].  
**Numbered queue:** empty. Jord-S0020 was the last numbered sprint.

Rows below are **not** sprints until a product need opens them. Artemis is a product fork, not a Jord sprint.

## Not numbered (promote only if needed)

| Item | Source | Notes |
|------|--------|-------|
| Blob enhancements: multipart, larger limits, remote S3 | S0013 deferred | |
| Redis-compatible cache | 01-later | When live state needs it |
| Bot / second cloud process | 01-later | When the in-process writer is the wrong shape |
| Hosted embed API · embedding CDC | S0014 deferred | Search engines shipped in S0020; callers still supply floats |

## Explicitly not Jord sprint cards

| Item | Home |
|------|------|
| Artemis trading domain / terminal | Product fork — [[../../idea/artemis/README]] |
| Tia map engine | [[../../feature_list/tia/README]] |
| Apolyx kit carryovers | [[../../feature_list/ui-kit/01-apolyx-s0001-carryovers]] |
| CI pipeline / npm publish | Lab infra |

## Carryovers already deferred inside closed ships

- S0009 — native SQL triggers on Postgres; column-level policies
- S0010 — Studio URL editor; migrate file→Postgres wizard
- S0011 / S0018 — true SQLite update hooks / PG LISTEN
- S0012 — OCC editor for arbitrary tables
- S0013 — full S3 / SigV4 / remote object store; blob CDC
- S0014 / S0020 — hosted embed API; embedding CDC. Engine distance and `pgvector` **shipped**; cosine remains the fallback when the engine lacks them
- S0017 — non-`records` RLS; drop middleware on Postgres
- S0019 — embedded replicas; file→Turso wizard; Studio paste-URL UI

## Rule

**Do not open Jord-S0021** from this list automatically. Promote one row into a new card only when the product needs it. Artemis stays a product track.
