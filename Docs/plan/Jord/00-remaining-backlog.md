---
title: "Jord — remaining backlog (post S0014)"
description: "Sequenced leftover work from feature_list after Studio S11 vectors"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - backlog
  - Jord-S0014
---

# Jord — remaining backlog

> Who: **mimir** picking the next card. Intent sources: [[../../feature_list/Jord/01-later]], [[../../feature_list/Jord/02-architecture]], [[../../feature_list/Jord/03-jord-studio]], plus deferred items from closed tech_space notes. Shipped review: [[../../report/Jord-implemented-review]].

**Last closed:** [[Jord-S0014/README|Jord-S0014]] — Studio S11 vectors · as-built [[../../tech_space/jord/13-s0014-vectors]].

## Priority queue (Jord-owned)

| Order | Item | Source | Suggested sprint | Notes |
|-------|------|--------|------------------|-------|
| **1** | User-table mutations (insert/update/delete) + optional generated CRUD for non-`records` | S0012 out-of-scope · S0006 | Jord-S0015 | Completes multi-table as a real editor |
| 2 | Schema DROP / RENAME / type change | S0004 / S0012 deferred | Jord-S0016 | Admin-only; careful with reserved tables |
| 3 | Native Postgres RLS compile from Jord policies | 01-later · S0009 deferred | Jord-S0017 | libSQL keeps middleware |
| 4 | Realtime: WebSockets and/or native CDC hooks; fanout beyond `records` | S0011 deferred · 01-later | Jord-S0018 | SSE stays |
| 5 | Hosted `libsql://` (Turso) | 01-later · architecture | Jord-S0019 | Same LibSqlAdapter, auth token env |
| 6 | `pgvector` / sqlite-vec hard path | S0014 deferred · architecture | Jord-S0020 | Cosine fallback remains default until then |
| 7 | Blob enhancements: multipart, larger limits, remote S3 backend | S0013 deferred | later | |
| 8 | Redis-compatible cache | 01-later | when product needs it | |
| 9 | Bot / second cloud process | 01-later | when in-process writer is wrong | |

## Explicitly not Jord sprint cards

| Item | Home |
|------|------|
| Artemis trading domain / terminal | Product fork — [[../../idea/artemis/README]] |
| Tia map engine | [[../../feature_list/tia/README]] |
| Apolyx kit carryovers | [[../../feature_list/ui-kit/01-apolyx-s0001-carryovers]] |
| CI pipeline / npm publish | Lab infra |

## Carryovers already deferred inside closed ships (track here)

From as-built notes (non-exhaustive):

- S0009 — native SQL triggers on Postgres; column-level policies
- S0010 — Studio URL editor; migrate file→Postgres wizard
- S0011 — WebSockets; native SQLITE update hooks / LISTEN
- S0012 — DROP/RENAME; OCC editor for arbitrary tables
- S0013 — full S3 / SigV4 / remote object store; blob CDC
- S0014 — hard sqlite-vec/pgvector; hosted embed API; embedding CDC

## Rule

**One active Jord sprint at a time.** Open S0015 (or next) only after naming it on [[README]]. Artemis may fork in parallel only as a *product* track, not by stuffing trading tables into `records.body`.
