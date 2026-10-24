---
title: "Jord Studio — dashboard and control plane"
description: "Jord Studio surfaces: tables, visualizer, jobs, auth, APIs, plus roadmap for realtime CDC, blobs, and vectors. Not Slice 0."
created: 2026-10-18
updated: 2026-10-24
tags:
  - feature
  - jord
  - jord-studio
  - dashboard
  - Jord-S0002
  - Jord-S0003
  - Jord-S0004
  - Jord-S0005
  - Jord-S0006
  - Jord-S0007
  - Jord-S0009
  - Jord-S0012
  - Jord-S0013
  - Jord-S0014
---

# Jord Studio — dashboard and control plane

> Product: **Jord Studio**. Package: `apps/jord-studio` (`@altr/jord-studio`). Phase-01 **shipped** (Studio S1–S11 + hardening through S0020). Capabilities: [[04-phase-01-capabilities]]. Slice 0: [[../../plan/Jord/phase-01/Jord-S0001/README|Jord-S0001]]. Architecture: [[02-architecture]]. Phase-02: [[01-phase-02-candidates]] · [[../../plan/Jord/phase-02/README]].

## Why

Jord is the engine (port + file/server). Jord Studio is the control plane: tables, jobs, logs, auth, APIs, and later realtime, blobs, and vectors. Without Studio, Jord is a library and a few routes.

## Who

You first, one Jord database. Multi-tenant Studio hosting waits until auth and roles exist.

## Surfaces

None of these land in Slice 0. Build order: [[01-phase-02-candidates]].

### Data

| Area | What you see and do |
|------|---------------------|
| Tables | List tables, browse rows, create and alter columns |
| Schema visualizer | Graph of tables and relations; **live save** runs migrations through Jord |
| Live save | Schema and function edits persist in-process (or one explicit save request). Not “export SQL only” |

### Runtime

| Area | What you see and do |
|------|---------------------|
| Jobs / cron | Schedule jobs; next / last / failure |
| Logs | Request, job, migration logs |
| Auth | Sessions for Studio and API consumers; feature roles |

### APIs

| Area | What you see and do |
|------|---------------------|
| Generated API | CRUD routes per table; inspect and toggle |
| Custom APIs | Named endpoints registered on `@altr/jord-server` |
| Function APIs | Multi-step functions; edit and live save |

### Database features (dialect-aware)

| Area | What you see and do |
|------|---------------------|
| Functions / triggers | Jord definitions; SQL emitted per adapter ([[02-architecture]]) |
| Policies | On libSQL: enforced in `@altr/jord-server` middleware. On Postgres: same middleware **plus** compiled native RLS ([[../../tech_space/jord/policies]]) |
| Roles | Schema edit, job manage, read-only |

### Supabase-parity surfaces (roadmap)

| Area | What you see and do | Depends on engine pillar in [[01-phase-02-candidates]] |
|------|---------------------|------------------------------------------|
| **Realtime** | Subscribe to table/row changes (write-path CDC-equivalent → SSE + WebSockets) — **shipped** [[../../tech_space/jord/realtime]] | Realtime layer |
| **Blobs** | Browse and upload assets in Jord buckets (S3-shaped REST) — **shipped** [[../../tech_space/jord/blobs]] | Local blob storage |
| **Vectors** | Upsert / search embeddings via `searchVectors` — **shipped** [[../../tech_space/jord/vectors]] | In-process cosine (v1) |

### Docs inside Studio

In-app help for tables and routes. Obsidian `Docs/` remains the lab vault.

## Package and UI

| Piece | Choice |
|-------|--------|
| App | `apps/jord-studio` — Next.js |
| Design system | Apolyx (`@altr/apolyx`) |
| Talks to | `@altr/jord-server` over HTTP (later SSE / WebSockets for realtime) |
| Never opens | `data/jord.db` from the browser. All writes go through the server (honors the write-batching invariant) |

## Storage reminder (Studio UI)

Jord is **libSQL / SQL**. Studio must not teach operators that Jord is a JSON document store. The `records.body` column is `TEXT` (often a JSON *string* for agent scratchpad). Insert/edit UX should look like a **table editor** (column fields), matching Supabase Table Editor expectations. Plan: [[../../plan/Jord/phase-01/Jord-S0003/README]].

## Phases (Studio only)

| Phase | Outcome | Depends on |
|-------|---------|------------|
| S1 | Table list + row browser for `records` | Slice 0 server — **done** ([[../../plan/Jord/phase-01/Jord-S0002/README]]) |
| S1.5 | Categorized side nav + Supabase-like Insert/edit for `records` | S1 — **done** ([[../../plan/Jord/phase-01/Jord-S0003/README]] · [[../../tech_space/jord/studio]]) |
| S2 | Schema visualizer + live save (additive `ADD COLUMN` v1) | S1.5 — **done** ([[../../plan/Jord/phase-01/Jord-S0004/README]] · [[../../tech_space/jord/schema]]) |
| S3 | Auth + feature roles (`admin` / `editor` / `readonly`) | S1 — **done** ([[../../plan/Jord/phase-01/Jord-S0005/README]] · [[../../tech_space/jord/auth]]) |
| S4 | Generated CRUD API panel | S1 — **done** ([[../../plan/Jord/phase-01/Jord-S0006/README]] · [[../../tech_space/jord/apis]]) |
| S5 | Jobs / cron + logs | Server job runner — **done** ([[../../plan/Jord/phase-01/Jord-S0007/README]] · [[../../tech_space/jord/jobs]]) |
| S6 | Custom + function APIs editor | S4 — **done** ([[../../plan/Jord/phase-01/Jord-S0008/README|Jord-S0008]] · [[../../tech_space/jord/apis]]) |
| S7 | Triggers, policies | S2 + dialect seam — **done** ([[../../plan/Jord/phase-01/Jord-S0009/README|Jord-S0009]] · [[../../tech_space/jord/policies]]) |
| S8 | Postgres connection (`PostgresAdapter`) | Postgres driver — **done** ([[../../plan/Jord/phase-01/Jord-S0010/README|Jord-S0010]] · [[../../tech_space/jord/dialects]]) |
| S9 | Realtime subscriptions UI | CDC-equivalent emit + SSE — **done** ([[../../plan/Jord/phase-01/Jord-S0011/README|Jord-S0011]] · [[../../tech_space/jord/realtime]]) |
| **S9.5** | **Multi-table browse + CREATE TABLE** | Schema create + open beyond `records` — **done** ([[../../plan/Jord/phase-01/Jord-S0012/README|Jord-S0012]] · [[../../tech_space/jord/schema]]) |
| S10 | Blob buckets UI — **done** [[../../plan/Jord/phase-01/Jord-S0013/README|Jord-S0013]] · [[../../tech_space/jord/blobs]] | Local blob storage |
| S11 | Vector / embedding ops UI — **done** [[../../plan/Jord/phase-01/Jord-S0014/README|Jord-S0014]] · [[../../tech_space/jord/vectors]] | `searchVectors` + lab cosine |

## Out of scope for Studio S1

- Postgres, Redis, Mongo
- Realtime, blobs, vectors UI
- Multi-tenant hosting
- Artemis trading screens
- Replacing Obsidian `Docs/`

## Acceptance for “Studio exists” (S1)

- [x] `apps/jord-studio` runs and uses Apolyx
- [x] Local-dev or signed-in gate can list `records` from `@altr/jord-server`
- [x] No direct browser access to `data/jord.db`

S1 plan (closed): [[../../plan/Jord/phase-01/Jord-S0002/README]] · [[../../tech_space/jord/studio]].  
S1.5 plan (closed): [[../../plan/Jord/phase-01/Jord-S0003/README]] · [[../../tech_space/jord/studio]].  
S2 plan (closed): [[../../plan/Jord/phase-01/Jord-S0004/README]] · [[../../tech_space/jord/schema]].  
S3 plan (closed): [[../../plan/Jord/phase-01/Jord-S0005/README]] · [[../../tech_space/jord/auth]].  
S4 plan (closed): [[../../plan/Jord/phase-01/Jord-S0006/README]] · [[../../tech_space/jord/apis]].  
S5 plan (closed): [[../../plan/Jord/phase-01/Jord-S0007/README]] · [[../../tech_space/jord/jobs]].  
S6 plan (closed): [[../../plan/Jord/phase-01/Jord-S0008/README]] · [[../../tech_space/jord/apis]].  
S7 plan (closed): [[../../plan/Jord/phase-01/Jord-S0009/README]] · [[../../tech_space/jord/policies]].  
S8 plan (closed): [[../../plan/Jord/phase-01/Jord-S0010/README]] · [[../../tech_space/jord/dialects]].  
S9 plan (closed): [[../../plan/Jord/phase-01/Jord-S0011/README]] · [[../../tech_space/jord/realtime]].  
**Phase-01 closed** through [[../../plan/Jord/phase-01/Jord-S0020/README|Jord-S0020]]. Studio archive: [[../../plan/Jord/phase-01/README]]. Remaining: [[../../plan/Jord/phase-02/00-remaining-backlog]]. Review: [[../../report/Jord-implemented-review]].
