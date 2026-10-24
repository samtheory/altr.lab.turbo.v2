---
title: "Jord — remaining backlog (post S0017)"
description: "S0017 closed; next numbered card is S0018; queue ends at Jord-S0020"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - backlog
  - Jord-S0017
---

# Jord — remaining backlog

> Who: **mimir** picking the next card. Intent sources: [[../../feature_list/Jord/01-later]], [[../../feature_list/Jord/02-architecture]], [[../../feature_list/Jord/03-jord-studio]], plus deferred items from closed tech_space notes. Shipped review: [[../../report/Jord-implemented-review]].

**Last closed:** [[Jord-S0017/README|Jord-S0017]] — native Postgres RLS · as-built [[../../tech_space/jord/16-s0017-postgres-rls]].  
**Next to open:** Jord-S0018 (realtime WebSockets / multi-table fanout). Not opened yet.

**Last numbered sprint is Jord-S0020.** Closing S0020 empties this queue. Rows 7–9 are not sprints until a product need opens them. Artemis is a product fork, not a Jord sprint.

## Priority queue (Jord-owned)

| Order | Item | Source | Sprint | Notes |
|-------|------|--------|--------|-------|
| **1** | User-table insert/update/delete | S0012 out-of-scope | **Jord-S0015** (done) | Generic REST + Studio grid |
| **2** | Schema DROP / RENAME / type change | S0004 / S0012 deferred | **Jord-S0016** (done) | Admin-only |
| **3** | Native Postgres RLS compile from Jord policies | 01-later · S0009 deferred | **Jord-S0017** (done) | libSQL keeps middleware |
| **4** | Realtime: WebSockets and/or native CDC; fanout beyond `records` | S0011 deferred | **Jord-S0018** (next) | SSE stays |
| 5 | Hosted `libsql://` (Turso) | 01-later · architecture | Jord-S0019 | Same LibSqlAdapter, auth token env |
| **6** | `pgvector` / sqlite-vec hard path | S0014 deferred | **Jord-S0020 — last numbered** | Cosine fallback stays until this closes |
| 7 | Blob enhancements: multipart, larger limits, remote S3 | S0013 deferred | not numbered | Open only if product needs it |
| 8 | Redis-compatible cache | 01-later | not numbered | When live state needs it |
| 9 | Bot / second cloud process | 01-later | not numbered | When in-process writer is the wrong shape |

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
- S0011 — WebSockets; native SQLITE update hooks / LISTEN (→ **S0018**)
- S0012 — OCC editor for arbitrary tables
- S0013 — full S3 / SigV4 / remote object store; blob CDC
- S0014 — hard sqlite-vec/pgvector; hosted embed API; embedding CDC
- S0017 — non-`records` RLS; drop middleware on Postgres

## Rule

**One active Jord sprint at a time.** S0017 is closed. Open S0018 on [[README]] before building it. After S0020, stop opening numbered cards unless rows 7–9 are promoted. Artemis stays a product track.
