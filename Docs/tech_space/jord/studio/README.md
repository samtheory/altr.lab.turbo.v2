---
title: "Jord Studio"
description: "Next.js control plane: BFF, session cookie, Apolyx-only UI, and which screen owns which API"
created: 2026-10-24
updated: 2026-10-24
tags:
  - tech-space
  - jord
  - studio
---

# Jord Studio

> Who: anyone changing `apps/jord-studio`. Product intent: [[../../../feature_list/Jord/03-jord-studio]]. Server behavior lives in the other categories — this note is only the control plane.

## Why

Operators need tables, jobs, APIs, and files without a SQL shell and without the browser opening `data/jord.db`. The app is a proxy plus screens.

## What

| Piece | Fact |
|-------|------|
| Package | `apps/jord-studio` (`@altr/jord-studio`), Next.js |
| UI | `@altr/apolyx` only. No local Dialog/Table kit |
| Upstream | `JORD_SERVER_URL` default `http://127.0.0.1:8787` |
| Dev | `pnpm dev:jord` then `pnpm dev:jord-studio` (`:3005`) |
| Gate | `/login` sets `jord_session`. `JORD_STUDIO_OPEN=1` skips the gate for local dev |
| Proxy | `src/lib/jord-proxy.ts` — `cache: "no-store"`. Upstream down → **503**. **409** passes through |

`body` on `records` is TEXT. The editor is column fields. A switch may validate JSON; storage is still a string.

## How — screens

Nav config: `apps/jord-studio/src/lib/studio-nav.ts`. Shell: `StudioShell` (desktop `NavList`, mobile `Sheet`).

| Screen | Route | Talks to |
|--------|-------|----------|
| Records editor | `/records` | [[../writes/README]] + Live [[../realtime/README]] |
| Tables | `/tables`, `/tables/[name]` | [[../schema/README]] [[../writes/README]] |
| Schema | `/schema` | [[../schema/README]] |
| Connection | `/database/connection` | [[../dialects/README]] |
| Policies / Triggers | Database nav | [[../policies/README]] |
| Generated / Function / Custom APIs | `/apis/…` | [[../apis/README]] |
| Jobs / Logs | `/jobs`, `/logs` | [[../jobs/README]] |
| Storage | `/storage` | [[../blobs/README]] |
| Vectors | `/vectors` | [[../vectors/README]] |

BFF routes live under `apps/jord-studio/src/app/api/` and mirror the server paths (`/api/records`, `/api/schema/…`, `/api/realtime`, `/api/blobs/…`, `/api/vectors/…`).

## Example

```bash
pnpm dev:jord
pnpm dev:jord-studio
```

Sign in, open **Records**, insert a row, toggle **Live**, and PATCH the same id from `curl` with the matching bearer. The grid refetches on `jord.change`. A stale `version` still shows the server’s **409**.

## Not in Jord yet

A connection-string editor, multi-tenant hosting, Artemis screens inside Studio.
