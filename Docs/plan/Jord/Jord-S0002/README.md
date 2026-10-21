---
title: "Jord-S0002 — Jord Studio S1 (records browser)"
description: "Closed: apps/jord-studio lists and edits records via jord-server; UI by apollo (Apolyx-first)"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - jord
  - Jord-S0002
  - jord-studio
  - sprint
---

# Jord-S0002 — Jord Studio S1 (records browser)

> Who: **apollo** (UI) under **mimir**. **Status: done (2026-10-21).** Intent: [[../../../feature_list/Jord/03-jord-studio]]. As-built: [[../../../tech_space/jord/01-s0002-studio-s1]]. Engine: [[../Jord-S0001/README]] · [[../../../tech_space/jord/00-s0001-slice0]]. Roadmap: [[../../00-roadmap-apolyx-jord-artemis]].

**Sprint id:** `Jord-S0002`  
**Opened:** 2026-10-21 · **Closed:** 2026-10-21 · **Owner:** apollo (UI) under mimir  
**Do not start** Studio S2+ (schema visualizer, auth, jobs, Postgres, realtime, blobs, vectors) until a new plan folder opens.

## Goal

Ship `apps/jord-studio`: a local Next.js app that **lists and browses `records`** (and can create / patch with OCC) by talking to `@altr/jord-server`. UI is **Apolyx-first** (`@altr/apolyx` only). The browser never opens `data/jord.db`.

## Phases

| # | Card | Delivers | Status |
|---|------|----------|--------|
| 1 | [[01-app-scaffold]] | `apps/jord-studio`, workspace, Apolyx + theme shell | **done** |
| 2 | [[02-server-proxy]] | Next route handlers → `JORD_SERVER_URL` (no raw file access) | **done** |
| 3 | [[03-records-list]] | Bucket filter + table of rows (newest first) | **done** |
| 4 | [[04-record-mutate]] | Create + detail + PATCH with `version`; show 409 | **done** |
| 5 | [[05-local-gate]] | Local-dev banner; no multi-tenant auth yet | **done** |
| 6 | [[06-verify]] | Typecheck / smoke; docs_man tech_space + STATUS | **done** |

## Plan-level decisions

Locked so implementation does not reopen them. Studio contract stays in [[../../../feature_list/Jord/03-jord-studio]].

1. **App = Next.js** under `apps/jord-studio` (`@altr/jord-studio`), similar stack to `apps/apolyx` (App Router, Tailwind, workspace `@altr/apolyx`).
2. **Apolyx-first.** No Radix / Base UI / local Button-Input-Table forks. Compose Table, Field, Button, Pagination, Scroll Area, Select/Combobox from `@altr/apolyx`. Missing control → stop and build in kit with **apollo**, then import.
3. **Browser never opens the DB file.** All reads/writes go through `@altr/jord-server` (Slice 0 write-queue invariant).
4. **S1 transport = Next.js Route Handlers as BFF** (`/api/records` → `http://127.0.0.1:8787`). Avoids CORS for day-one Studio. Env: `JORD_SERVER_URL` (default `http://127.0.0.1:8787`). Direct browser→8787 + CORS is a later option, not this sprint’s default.
5. **Dev requires two processes:** `pnpm dev:jord` (API) + `pnpm dev:jord-studio` (UI). Document in the app README.
6. **Local-dev gate only.** S1 has no real auth. A visible “local Studio — not for production” banner is enough. Signed-in gate is Studio S3.
7. **OCC stays on the server.** Studio sends `version` on PATCH; on **409**, refresh the row and show a conflict message. Do not invent client-side locks.
8. **Out of sprint:** schema visualizer, migrations UI, jobs, logs, generated API panel, Postgres, Redis, Mongo, realtime, blobs, vectors, Artemis screens.

## Definition of done

- [x] Every card's "Done when" holds
- [x] [[../../../feature_list/Jord/03-jord-studio]] S1 acceptance is true
- [x] `pnpm --filter @altr/jord-studio typecheck` passes
- [x] Manual: with `dev:jord` up, Studio lists a bucket and round-trips create / patch / stale 409
- [x] `tech_space` note after code lands ([[../../../tech_space/jord/01-s0002-studio-s1]])
- [x] No new kit primitives invented inside `apps/jord-studio`

## Links

- Track: [[../README]]
- Studio intent: [[../../../feature_list/Jord/03-jord-studio]]
- Engine (done): [[../Jord-S0001/README]] · [[../../../tech_space/jord/00-s0001-slice0]]
- As-built S1: [[../../../tech_space/jord/01-s0002-studio-s1]]
- Apolyx-first: `.cursor/rules/apolyx-first.mdc`
