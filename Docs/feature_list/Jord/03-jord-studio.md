---
title: "Jord Studio — dashboard and control plane"
description: "Jord Studio surfaces: tables, visualizer, jobs, auth, APIs, plus roadmap for realtime CDC, blobs, and vectors. Not Slice 0."
created: 2026-10-18
updated: 2026-10-21
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
---

# Jord Studio — dashboard and control plane

> Product: **Jord Studio**. Package: `apps/jord-studio` (`@altr/jord-studio`). Slice 0 engine is done ([[../../plan/Jord/Jord-S0001/README|Jord-S0001]]). **Studio S1–S6 shipped:** through [[../../plan/Jord/Jord-S0008/README|Jord-S0008]] · as-built [[../../tech_space/jord/07-s0008-custom-function-apis]]. Architecture: [[02-architecture]]. Later phases: [[01-later]].

## Why

Jord is the engine (port + file/server). Jord Studio is the control plane: tables, jobs, logs, auth, APIs, and later realtime, blobs, and vectors. Without Studio, Jord is a library and a few routes.

## Who

You first, one Jord database. Multi-tenant Studio hosting waits until auth and roles exist.

## Surfaces

None of these land in Slice 0. Build order: [[01-later]].

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
| Policies | On libSQL: enforced in `@altr/jord-server` middleware. On Postgres: compiled to native RLS |
| Roles | Schema edit, job manage, read-only |

### Supabase-parity surfaces (roadmap)

| Area | What you see and do | Depends on engine pillar in [[01-later]] |
|------|---------------------|------------------------------------------|
| **Realtime** | Subscribe to table/row changes (CDC → SSE / WebSockets from `@altr/jord-server`) | Realtime layer |
| **Blobs** | Browse and upload assets in Jord buckets (S3-shaped or static file API) | Local blob storage |
| **Vectors** | Trigger or inspect embedding / `searchVectors` jobs for semantic memory | In-process vector pipelines |

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

Jord is **libSQL / SQL**. Studio must not teach operators that Jord is a JSON document store. The `records.body` column is `TEXT` (often a JSON *string* for agent scratchpad). Insert/edit UX should look like a **table editor** (column fields), matching Supabase Table Editor expectations. Plan: [[../../plan/Jord/Jord-S0003/README]].

## Phases (Studio only)

| Phase | Outcome | Depends on |
|-------|---------|------------|
| S1 | Table list + row browser for `records` | Slice 0 server — **done** ([[../../plan/Jord/Jord-S0002/README]]) |
| S1.5 | Categorized side nav + Supabase-like Insert/edit for `records` | S1 — **done** ([[../../plan/Jord/Jord-S0003/README]] · [[../../tech_space/jord/02-s0003-studio-shell]]) |
| S2 | Schema visualizer + live save (additive `ADD COLUMN` v1) | S1.5 — **done** ([[../../plan/Jord/Jord-S0004/README]] · [[../../tech_space/jord/03-s0004-schema]]) |
| S3 | Auth + feature roles (`admin` / `editor` / `readonly`) | S1 — **done** ([[../../plan/Jord/Jord-S0005/README]] · [[../../tech_space/jord/04-s0005-auth]]) |
| S4 | Generated CRUD API panel | S1 — **done** ([[../../plan/Jord/Jord-S0006/README]] · [[../../tech_space/jord/05-s0006-generated-api]]) |
| S5 | Jobs / cron + logs | Server job runner — **done** ([[../../plan/Jord/Jord-S0007/README]] · [[../../tech_space/jord/06-s0007-jobs-logs]]) |
| S6 | Custom + function APIs editor | S4 — **done** ([[../../plan/Jord/Jord-S0008/README|Jord-S0008]] · [[../../tech_space/jord/07-s0008-custom-function-apis]]) |
| S7 | Triggers, policies | S2 + dialect seam |
| S8 | Postgres connection (`PostgresAdapter`) | Postgres driver installed |
| S9 | Realtime subscriptions UI | CDC / SSE / WS on server |
| S10 | Blob buckets UI | Local blob storage |
| S11 | Vector / embedding ops UI | `searchVectors` + sqlite-vec or pgvector |

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

S1 plan (closed): [[../../plan/Jord/Jord-S0002/README]] · [[../../tech_space/jord/01-s0002-studio-s1]].  
S1.5 plan (closed): [[../../plan/Jord/Jord-S0003/README]] · [[../../tech_space/jord/02-s0003-studio-shell]].  
S2 plan (closed): [[../../plan/Jord/Jord-S0004/README]] · [[../../tech_space/jord/03-s0004-schema]].  
S3 plan (closed): [[../../plan/Jord/Jord-S0005/README]] · [[../../tech_space/jord/04-s0005-auth]].  
S4 plan (closed): [[../../plan/Jord/Jord-S0006/README]] · [[../../tech_space/jord/05-s0006-generated-api]].  
S5 plan (closed): [[../../plan/Jord/Jord-S0007/README]] · [[../../tech_space/jord/06-s0007-jobs-logs]].  
S6 plan (closed): [[../../plan/Jord/Jord-S0008/README]] · [[../../tech_space/jord/07-s0008-custom-function-apis]]. Later phases (S7+) get their own plan folders when opened by mimir.
