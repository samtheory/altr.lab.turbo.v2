---
title: "Jord — implemented work review (S0001–S0015)"
description: "Review packet: everything shipped in Jord engine + Studio through vectors; for human/agent review"
created: 2026-10-24
updated: 2026-10-24
tags:
  - report
  - jord
  - review
  - Jord-S0001
  - Jord-S0014
---

# Jord — implemented work review (S0001–S0015)

> **Audience:** reviewers (human or agent). **Scope:** all Jord work closed through 2026-10-24. Truth order: **code** > tech_space > this report. Living map: [[../brain/00-Docs-Brain]]. Track: [[../plan/Jord/README]]. **Next:** Jord-S0016 on [[../plan/Jord/00-remaining-backlog]].

**Packages:** `elements/jord` (`@altr/jord`) · `cloud/jord` (`@altr/jord-server`) · `apps/jord-studio` · data: `data/jord.db`, `data/blobs/` (gitignored)

---

## Executive summary

Jord is the lab **data plane**: dialect port (libSQL file + Postgres), OCC scratchpad `records`, write queue, auth roles, Studio control plane (tables, schema, APIs, jobs, policies, triggers, realtime SSE, multi-table create/browse, user-table row writes, local blobs, vectors). **15 sprints closed.**

| Metric | Value |
|--------|-------|
| Closed sprints | Jord-S0001 … Jord-S0015 |
| Studio phases | S1–S11 (+ S9.5 multi-table) |
| Active Jord sprint | _(none — pick from backlog)_ |
| Product fork (not Jord) | Artemis (idea only) |

---

## Shipped by sprint

| ID | Scope | Closed | As-built |
|----|--------|--------|----------|
| S0001 | Slice 0: file DB, WAL, OCC `records`, jord-server routes | 2026-10-21 | [[../tech_space/jord/00-s0001-slice0]] |
| S0002 | Studio S1 records browser + BFF | 2026-10-21 | [[../tech_space/jord/01-s0002-studio-s1]] |
| S0003 | Side nav + table-editor Insert/edit UX | 2026-10-21 | [[../tech_space/jord/02-s0003-studio-shell]] |
| S0004 | Schema introspect + ADD COLUMN + visualizer | 2026-10-21 | [[../tech_space/jord/03-s0004-schema]] |
| S0005 | Auth sessions + roles admin/editor/readonly | 2026-10-21 | [[../tech_space/jord/04-s0005-auth]] |
| S0006 | Generated CRUD API catalog + DELETE records | 2026-10-21 | [[../tech_space/jord/05-s0006-generated-api]] |
| S0007 | Jobs / interval scheduler + log ring | 2026-10-21 | [[../tech_space/jord/06-s0007-jobs-logs]] |
| S0008 | Custom + function APIs (`/x/:slug`) | 2026-10-21 | [[../tech_space/jord/07-s0008-custom-function-apis]] |
| S0009 | Policies middleware + AFTER triggers | 2026-10-23 | [[../tech_space/jord/08-s0009-triggers-policies]] |
| S0010 | PostgresAdapter + dialect health | 2026-10-24 | [[../tech_space/jord/09-s0010-postgres]] |
| S0011 | Realtime SSE after writes; Studio Live | 2026-10-24 | [[../tech_space/jord/10-s0011-realtime]] |
| S0012 | CREATE TABLE + multi-table browse | 2026-10-24 | [[../tech_space/jord/11-s0012-multi-table]] |
| S0013 | Local blob buckets + Studio Storage | 2026-10-24 | [[../tech_space/jord/12-s0013-blobs]] |
| S0014 | Vectors / `searchVectors` + Studio Vectors | 2026-10-24 | [[../tech_space/jord/13-s0014-vectors]] |
| S0015 | User-table row insert/update/delete | 2026-10-24 | [[../tech_space/jord/14-s0015-user-table-writes]] |

---

## Capability matrix (what exists today)

| Capability | Status | Notes |
|------------|--------|-------|
| `file:` libSQL + WAL + snapshot | **Done** | Default `data/jord.db` |
| `postgres://` / `postgresql://` | **Done** | Same port CRUD; WAL skipped |
| OCC `records` + HTTP 409 | **Done** | Single write queue |
| Studio table editor for `records` | **Done** | |
| Schema list / describe / ADD COLUMN / CREATE TABLE / DROP / RENAME / type | **Done** | [[../tech_space/jord/15-s0016-schema-drop-rename]] |
| Browse non-`records` tables | **Done** | Read grid plus insert/update/delete (S0015) |
| Auth + feature roles | **Done** | |
| Generated API panel | **Done** | `records`-centric |
| Jobs + logs | **Done** | In-process |
| Custom / function APIs | **Done** | Built-in steps |
| Policies + triggers | **Done** | App middleware; not native PG RLS |
| Realtime SSE | **Done** | Emit on write path; `records` channel |
| Local blobs | **Done** | Disk + `jord_blobs`; S3-shaped REST |
| Vectors / `searchVectors` | **Done** | `jord_embeddings` + cosine lab path |
| Hosted `libsql://` | Not started | |
| Hard sqlite-vec / pgvector | Deferred | Cosine fallback is v1 |
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

- [ ] Spot-check as-built notes vs code for S0012–S0014 (newest)
- [ ] Confirm role gates on schema / blobs / vectors / jobs match Studio UI
- [ ] Confirm `/health` never leaks connection strings
- [ ] Confirm gitignore covers `data/*.db*` and `data/blobs/`
- [ ] Agree next backlog card (Postgres RLS S0017)
- [ ] Agree when to hard-require sqlite-vec / pgvector

---

## Links for deep dive

- Track [[../plan/Jord/README]] · Backlog [[../plan/Jord/00-remaining-backlog]] · STATUS [[STATUS]]
- Latest as-built [[../tech_space/jord/15-s0016-schema-drop-rename]]
