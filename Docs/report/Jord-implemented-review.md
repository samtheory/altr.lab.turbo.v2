---
title: "Jord — implemented work review (S0001–S0020)"
description: "Review packet: Jord engine + Studio through S0020, one row per closed sprint"
created: 2026-10-24
updated: 2026-10-24
tags:
  - report
  - jord
  - review
  - Jord-S0001
  - Jord-S0019
  - Jord-S0020
---

# Jord — implemented work review (S0001–S0020)

> **Audience:** reviewers (human or agent). **Scope:** Jord **phase-01** closed through 2026-10-24. Truth order: **code** > tech_space > this report. Living map: [[../brain/00-Docs-Brain]]. Plans: [[../plan/Jord/README]] · archive [[../plan/Jord/phase-01/README]]. **Phase-02 queue:** empty — [[../plan/Jord/phase-02/README]]. Capabilities: [[../feature_list/Jord/04-phase-01-capabilities]].

**Packages:** `elements/jord` (`@altr/jord`) · `cloud/jord` (`@altr/jord-server`) · `apps/jord-studio` · data: `data/jord.db`, `data/blobs/` (gitignored)

---

## Executive summary

Jord is the lab **data plane**: dialect port (libSQL file + hosted Turso + Postgres), OCC scratchpad `records`, write queue, auth roles, Studio control plane through realtime SSE+WS with multi-table fanout, and engine vector search with a cosine fallback. **20 sprints closed.** The numbered queue is empty.

| Metric | Value |
|--------|-------|
| Closed sprints | Jord-S0001 … Jord-S0020 |
| Studio phases | S1–S11 (+ S9.5 multi-table) |
| Active Jord sprint | _(none — numbered queue empty)_ |
| Product fork (not Jord) | Artemis (idea only) |

---

## Shipped by sprint

Scope matches [[../plan/Jord/phase-01/README]]. Each row is closed.

| ID | Scope | Closed | As-built |
|----|--------|--------|----------|
| S0001 | Slice 0: `file:` libSQL, WAL, OCC `records`, snapshot | 2026-10-21 | [[../tech_space/jord/overview]] |
| S0002 | Studio S1 records browser | 2026-10-21 | [[../tech_space/jord/studio]] |
| S0003 | Side nav + table-editor UX | 2026-10-21 | [[../tech_space/jord/studio]] |
| S0004 | Schema introspect, visualizer, ADD COLUMN | 2026-10-21 | [[../tech_space/jord/schema]] |
| S0005 | Studio S3 auth + feature roles | 2026-10-21 | [[../tech_space/jord/auth]] |
| S0006 | Studio S4 generated CRUD API panel | 2026-10-21 | [[../tech_space/jord/apis]] |
| S0007 | Studio S5 jobs / cron + logs | 2026-10-21 | [[../tech_space/jord/jobs]] |
| S0008 | Studio S6 custom + function APIs | 2026-10-21 | [[../tech_space/jord/apis]] |
| S0009 | Studio S7 triggers + policies | 2026-10-23 | [[../tech_space/jord/policies]] |
| S0010 | Studio S8 Postgres connection | 2026-10-24 | [[../tech_space/jord/dialects]] |
| S0011 | Studio S9 realtime (SSE) | 2026-10-24 | [[../tech_space/jord/realtime]] |
| S0012 | Multi-table browse + CREATE TABLE | 2026-10-24 | [[../tech_space/jord/schema]] |
| S0013 | Studio S10 local blob buckets | 2026-10-24 | [[../tech_space/jord/blobs]] |
| S0014 | Studio S11 vectors (caller floats + cosine) | 2026-10-24 | [[../tech_space/jord/vectors]] |
| S0015 | User-table row writes | 2026-10-24 | [[../tech_space/jord/writes]] |
| S0016 | Schema DROP / RENAME / type change | 2026-10-24 | [[../tech_space/jord/schema]] |
| S0017 | Native Postgres RLS from Jord policies (`records`) | 2026-10-24 | [[../tech_space/jord/policies]] |
| S0018 | Realtime WebSockets + multi-table fanout | 2026-10-24 | [[../tech_space/jord/realtime]] |
| S0019 | Hosted `libsql://` (Turso) | 2026-10-24 | [[../tech_space/jord/dialects]] |
| S0020 | Hard vectors (libSQL engine + pgvector) | 2026-10-24 | [[../tech_space/jord/vectors]] |

---

## Capability matrix (what exists today)

| Capability | Status | Notes |
|------------|--------|-------|
| `file:` libSQL + WAL + snapshot | **Done** | Default `data/jord.db` |
| `postgres://` / `postgresql://` | **Done** | Same port CRUD; WAL skipped |
| OCC `records` + HTTP 409 | **Done** | Single write queue |
| Schema DDL + user-table CRUD | **Done** | |
| Auth + feature roles | **Done** | |
| Policies + triggers | **Done** | Middleware; Postgres also RLS on `records` |
| Realtime SSE + WebSocket | **Done** | Write-path emit; `records` + user tables |
| Local blobs | **Done** | Disk bytes + `jord_blobs` metadata (S0013). Remote S3 is backlog |
| Vectors | **Done** | Caller-supplied floats. `vectorBackend`: `libsql-vector`, `pgvector`, or `cosine` (S0014 + S0020) |
| Hosted `libsql://` | **Done** | Same LibSqlAdapter + token env. WAL only for `file:` (S0019) |
| Hard libSQL vectors | **Done** | Exact `vector_distance_cos` at ≤ 200 rows; DiskANN shadow above that. Index names encode `-` as `__`. `sqlite-vec` is not loaded |
| Postgres `pgvector` | **Done** | Best-effort extension, `embedding_vec vector(1536)`, HNSW, `<=>`. Probe failure keeps cosine |
| Redis / bot process | Not started | |
| Artemis product | Idea only | |

---

## Hard invariants (still true)

1. Browser **never** opens `data/jord.db` or blob paths — Studio → BFF → jord-server.
2. Hot writes go through **one write queue**.
3. `@altr/base` remains a **leaf**; Studio is **Apolyx-first**.
4. Artemis trading entities must **not** live in `records.body`.
5. Embeddings are **caller-supplied** — Jord does not call host embed APIs.

---

## Suggested review checklist

- [ ] Spot-check as-built notes vs code for S0019–S0020 (newest)
- [ ] Confirm `/health` never leaks connection strings or tokens (`vectorBackend` is a label only)
- [ ] Confirm gitignore covers `data/*.db*` and `data/blobs/`
- [ ] Leave the numbered queue empty unless a backlog row is promoted

---

## Links for deep dive

- Plans [[../plan/Jord/README]] · Archive [[../plan/Jord/phase-01/README]] · Phase-02 [[../plan/Jord/phase-02/README]] · STATUS [[STATUS]] · As-built [[../tech_space/jord/README]]
- Capabilities [[../feature_list/Jord/04-phase-01-capabilities]] · Latest as-built [[../tech_space/jord/vectors]]
