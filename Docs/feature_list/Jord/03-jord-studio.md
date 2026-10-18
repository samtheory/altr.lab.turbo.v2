---
title: "Jord Studio — dashboard and control plane"
description: "Intent for apps/jord-studio: tables, schema visualizer, live save, jobs, logs, auth, generated and custom APIs, functions, triggers, policies, roles"
created: 2026-10-18
updated: 2026-10-18
tags:
  - feature
  - jord
  - jord-studio
  - dashboard
---

# Jord Studio — dashboard and control plane

> Product name of the admin app: **Jord Studio**. Package target: `apps/jord-studio` (`@altr/jord-studio`). Not part of [[../../plan/Jord/Jord-S0001/README|Jord-S0001]]. Architecture: [[02-architecture]].

## Why

Jord is the engine (file + API). Jord Studio is the place you see and change that engine: tables, jobs, logs, auth, and the APIs other apps call. Without Studio, Jord is only a library and a few routes. With Studio, it becomes the control plane for altr.lab products.

## Who

You first, operating one Jord file. Multi-tenant Studio hosting waits until auth and roles exist.

## Surfaces

Each row is a Studio area. Build order is in [[01-later]]. None of these land in S0001.

### Data

| Area | What you see and do |
|------|---------------------|
| Tables | List tables, browse rows, create and alter columns through the UI |
| Schema visualizer | Graph of tables and relations. Edit the graph; **live save** writes migrations through Jord and refreshes the view |
| Live save | Schema and function edits persist immediately (or on an explicit save that runs in the same request). No “export SQL and paste elsewhere” as the only path |

### Runtime

| Area | What you see and do |
|------|---------------------|
| Jobs / cron | Schedule jobs (pollers, cleanup, Artemis-friendly timers). See next run, last run, failure |
| Logs | Request logs, job logs, migration logs. Filter by time and route |
| Auth | Users/sessions for Studio and for API consumers. Roles for features (who may edit schema, who may only read) |

### APIs

| Area | What you see and do |
|------|---------------------|
| Generated API | Normal REST (or RPC) for each table Jord knows: list, get, create, update, delete. Studio shows the routes and lets you turn them on or off |
| Custom APIs | Hand-written route modules registered in `@altr/jord-server`, editable from Studio as named endpoints |
| Function APIs | One endpoint that runs a **function** (a multi-step unit: read, write, call another function). Studio edits the function body or steps and saves live |

### Database features (dialect-aware)

| Area | What you see and do |
|------|---------------------|
| Functions | Named server-side units Studio can invoke or attach to APIs |
| Triggers | Fire on insert/update/delete. Stored as Jord definitions; SQL emitted per dialect ([[02-architecture]]) |
| Policies | Row or feature rules (who sees which rows). On Postgres may become RLS; on libSQL stay in the API |
| Roles | Feature roles for Studio and for API keys (schema edit, job manage, read-only) |

### Docs inside Studio

In-app short docs for the current project’s tables and generated routes. The Obsidian vault under `Docs/` stays the lab’s second brain. Studio docs are the product’s own help surface.

## Package and UI

| Piece | Choice |
|-------|--------|
| App | `apps/jord-studio` — Next.js |
| Design system | Apolyx (`@altr/apolyx`) |
| Talks to | `@altr/jord-server` over HTTP (and later websockets if live schema needs them) |
| Never opens | `data/jord.db` directly from the browser. All writes go through the server |

## Phases (Studio only)

| Phase | Outcome | Depends on |
|-------|---------|------------|
| S1 | Table list + row browser for `records` | Jord-S0001 server |
| S2 | Schema visualizer + live save for columns and simple relations | S1, migration runner in `@altr/jord` |
| S3 | Auth for Studio + roles (admin / read-only) | S1 |
| S4 | Generated CRUD API panel (inspect and toggle) | S1 |
| S5 | Jobs / cron + logs | S1 server job runner |
| S6 | Custom APIs and function APIs editor with live save | S4 |
| S7 | Triggers, policies, dialect-aware functions | S2 + [[02-architecture]] dialect seam |
| S8 | Postgres connection in Studio (same UI, second dialect) | Postgres driver in `@altr/jord` |

## Out of scope for the first Studio ship (S1)

- Postgres
- Multi-tenant hosting
- Building every Artemis screen inside Studio
- Replacing Obsidian `Docs/`

## Acceptance for “Studio exists” (S1)

- [ ] `apps/jord-studio` runs and uses Apolyx
- [ ] Signed-in or local-dev gate can list `records` from `@altr/jord-server`
- [ ] No direct browser access to `data/jord.db`

Later Studio phases get their own plan folders when S0001 is closed.
