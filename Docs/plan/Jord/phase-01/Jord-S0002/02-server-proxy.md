---
title: "Phase 2 — Studio → jord-server proxy"
description: "Next.js Route Handlers forward records traffic to JORD_SERVER_URL"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - jord
  - Jord-S0002
---

# Phase 2 — Studio → jord-server proxy

> Who: **apollo**. Mimics Slice 0 routes; does not open `data/jord.db`.

Sprint index: [[README]] · Server routes: [[../../../../feature_list/Jord/00-intent]]

## Behavior

| Studio route | Forwards to |
|--------------|-------------|
| `GET /api/health` | `GET {JORD_SERVER_URL}/health` |
| `GET /api/records?bucket=` | `GET /records?bucket=` |
| `GET /api/records/:id` | `GET /records/:id` |
| `POST /api/records` | `POST /records` |
| `PATCH /api/records/:id` | `PATCH /records/:id` |

- Default `JORD_SERVER_URL=http://127.0.0.1:8787`
- Pass through status codes (including **409**)
- On connection failure, return a clear 502/503 JSON error (“start `pnpm dev:jord`”)

## Status

**done** (2026-10-21)

## Tasks

- [x] Shared server-fetch helper (server-only; no `fs` to `data/jord.db`)
- [x] Route handlers for the five mappings above
- [x] `.env.example` documents `JORD_SERVER_URL`

## Done when

With jord-server running, `GET /api/health` from the Studio origin returns `{ ok: true, dialect: "libsql" }`. Grep of `apps/jord-studio` shows no import of `@libsql/client` or path to `jord.db`.
