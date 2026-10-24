---
title: "Jord — implemented work review (S0001–S0020)"
description: "Review packet: everything shipped in Jord engine + Studio through hard vectors"
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

> **Audience:** reviewers (human or agent). **Scope:** all Jord work closed through 2026-10-24. Truth order: **code** > tech_space > this report. Living map: [[../brain/00-Docs-Brain]]. Track: [[../plan/Jord/README]]. **Numbered queue:** empty — [[../plan/Jord/00-remaining-backlog]].

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

| ID | Scope | Closed | As-built |
|----|--------|--------|----------|
| S0001–S0016 | See prior review rows | 2026-10-21…24 | [[../tech_space/jord/00-s0001-slice0]] … [[../tech_space/jord/15-s0016-schema-drop-rename]] |
| S0017 | Native Postgres RLS from Jord policies | 2026-10-24 | [[../tech_space/jord/16-s0017-postgres-rls]] |
| S0018 | Realtime WebSockets + multi-table fanout | 2026-10-24 | [[../tech_space/jord/17-s0018-realtime-ws]] |
| S0019 | Hosted `libsql://` (Turso) | 2026-10-24 | [[../tech_space/jord/18-s0019-hosted-libsql]] |
| S0020 | Hard vectors (libSQL engine + pgvector) | 2026-10-24 | [[../tech_space/jord/19-s0020-hard-vectors]] |

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
| Local blobs / vectors | **Done** | Engine distance or `pgvector` when present; cosine fallback (S0014 + S0020) |
| Hosted `libsql://` | **Done** | Same LibSqlAdapter + token env (S0019) |
| Hard libSQL vectors / pgvector | **Done** | `vector_distance_cos` + optional `pgvector`; `sqlite-vec` is not loaded |
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

- Track [[../plan/Jord/README]] · Backlog [[../plan/Jord/00-remaining-backlog]] · STATUS [[STATUS]]
- Latest as-built [[../tech_space/jord/19-s0020-hard-vectors]]
