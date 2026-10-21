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
---

# Jord Studio — dashboard and control plane

> Product: **Jord Studio**. Package: `apps/jord-studio` (`@altr/jord-studio`). Slice 0 engine is done ([[../../plan/Jord/Jord-S0001/README|Jord-S0001]]). **Studio S1 shipped:** [[../../plan/Jord/Jord-S0002/README|Jord-S0002]] · as-built [[../../tech_space/jord/01-s0002-studio-s1]]. Architecture: [[02-architecture]]. Later phases: [[01-later]].

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

## Phases (Studio only)

| Phase | Outcome | Depends on |
|-------|---------|------------|
| S1 | Table list + row browser for `records` | Slice 0 server |
| S2 | Schema visualizer + live save | S1, migrations in `@altr/jord` |
| S3 | Auth + roles | S1 |
| S4 | Generated CRUD API panel | S1 |
| S5 | Jobs / cron + logs | Server job runner |
| S6 | Custom + function APIs editor | S4 |
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

S1 plan (closed): [[../../plan/Jord/Jord-S0002/README]] · [[../../tech_space/jord/01-s0002-studio-s1]]. Later Studio phases (S2+) get their own plan folders when opened by mimir.
