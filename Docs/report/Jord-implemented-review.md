---
title: "Jord — implemented work review (S0001–S0019)"
description: "Review packet: everything shipped in Jord engine + Studio through hosted libsql"
created: 2026-10-24
updated: 2026-10-24
tags:
  - report
  - jord
  - review
  - Jord-S0001
  - Jord-S0019
---

# Jord — implemented work review (S0001–S0019)

> **Audience:** reviewers (human or agent). **Scope:** all Jord work closed through 2026-10-24. Truth order: **code** > tech_space > this report. Living map: [[../brain/00-Docs-Brain]]. Track: [[../plan/Jord/README]]. **Next:** Jord-S0020 (last numbered) on [[../plan/Jord/00-remaining-backlog]].

**Packages:** `elements/jord` (`@altr/jord`) · `cloud/jord` (`@altr/jord-server`) · `apps/jord-studio` · data: `data/jord.db`, `data/blobs/` (gitignored)

---

## Executive summary

Jord is the lab **data plane**: dialect port (libSQL file + hosted Turso + Postgres), OCC scratchpad `records`, write queue, auth roles, Studio control plane through realtime SSE+WS with multi-table fanout. **19 sprints closed.**

| Metric | Value |
|--------|-------|
| Closed sprints | Jord-S0001 … Jord-S0019 |
| Studio phases | S1–S11 (+ S9.5 multi-table) |
| Active Jord sprint | _(none — next S0020 last numbered)_ |
| Product fork (not Jord) | Artemis (idea only) |

---

## Shipped by sprint

| ID | Scope | Closed | As-built |
|----|--------|--------|----------|
| S0001–S0016 | See prior review rows | 2026-10-21…24 | [[../tech_space/jord/00-s0001-slice0]] … [[../tech_space/jord/15-s0016-schema-drop-rename]] |
| S0017 | Native Postgres RLS from Jord policies | 2026-10-24 | [[../tech_space/jord/16-s0017-postgres-rls]] |
| S0018 | Realtime WebSockets + multi-table fanout | 2026-10-24 | [[../tech_space/jord/17-s0018-realtime-ws]] |

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
| Local blobs / vectors | **Done** | Cosine lab path |
| Hosted `libsql://` | **Done** | Same LibSqlAdapter + token env (S0019) |
| Hard sqlite-vec / pgvector | Deferred | → S0020 last numbered |
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

- [ ] Spot-check as-built notes vs code for S0017–S0019 (newest)
- [ ] Confirm `/health` never leaks connection strings or tokens
- [ ] Confirm gitignore covers `data/*.db*` and `data/blobs/`
- [ ] Agree next backlog card (hard vectors **S0020 — last numbered**)
- [ ] Agree when to hard-require sqlite-vec / pgvector (S0020)

---

## Links for deep dive

- Track [[../plan/Jord/README]] · Backlog [[../plan/Jord/00-remaining-backlog]] · STATUS [[STATUS]]
- Latest as-built [[../tech_space/jord/18-s0019-hosted-libsql]]
