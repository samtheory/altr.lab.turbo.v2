---
title: "Jord-S0002 — Studio S1 as-built"
description: "apps/jord-studio BFF to jord-server; Apolyx records list/create/OCC patch; local-dev gate"
created: 2026-10-21
updated: 2026-10-21
tags:
  - tech-space
  - jord
  - Jord-S0002
  - jord-studio
---

# Jord-S0002 — Studio S1 as-built

> Who: anyone running Studio locally, or mimir after S1. Intent: [[../../feature_list/Jord/03-jord-studio]] · Plan: [[../../plan/Jord/Jord-S0002/README]] · Engine: [[00-s0001-slice0]].

## Surfaces

| Package | Path | Role |
|---------|------|------|
| `@altr/jord-studio` | `apps/jord-studio` | Next.js App Router UI + BFF |
| `@altr/jord-server` | `cloud/jord` | Upstream (unchanged Slice 0) |
| DB file | `data/jord.db` | Still never opened from the browser |

UI imports **only** `@altr/apolyx` (ApolyxProvider, Table, Select, Field, Button, Alert). No Radix / Base UI / local kit forks.

## Dev

```bash
pnpm dev:jord          # :8787
pnpm dev:jord-studio   # :3005
```

| Env | Default | Role |
|-----|---------|------|
| `JORD_SERVER_URL` | `http://127.0.0.1:8787` | BFF upstream |
| `JORD_STUDIO_OPEN` | must be `1` | Local-dev gate (blocked screen otherwise) |

Documented in `apps/jord-studio/README.md` and `.env.example`.

## BFF routes

`apps/jord-studio/src/lib/jord-proxy.ts` → `fetch(JORD_SERVER_URL…)` with `cache: "no-store"`. Connection failure → **503** JSON telling the operator to start `pnpm dev:jord`. Status codes (incl. **409**) pass through.

| Studio | Upstream |
|--------|----------|
| `GET /api/health` | `GET /health` |
| `GET /api/records?bucket=` | `GET /records?bucket=` |
| `GET /api/records/:id` | `GET /records/:id` |
| `POST /api/records` | `POST /records` |
| `PATCH /api/records/:id` | `PATCH /records/:id` |

## UI pages

| Route | Behavior |
|-------|----------|
| `/` | Brand-first Jord Studio shell |
| `/records` | Bucket Select (default `lab`) + Apolyx Table; empty / 503 states |
| `/records/new` | Create form → detail |
| `/records/[id]` | Detail + PATCH with `version`; **409** reloads latest row |

Chrome: persistent “local / lab only” banner. Gate: `JORD_STUDIO_OPEN !== "1"` → blocked screen (no silent prod admin).

## Verify (2026-10-21)

- `pnpm --filter @altr/jord-studio typecheck` — pass
- `pnpm --filter @altr/apolyx typecheck` — pass (no kit edits)
- Grep: no `@libsql/client` / `jord.db` path usage under `apps/jord-studio` (comment/README only)
- Manual BFF: health `{ ok, dialect: "libsql" }` → create → list → patch bumps version → stale PATCH **409** leaves row unchanged

## Out of S1 (still later)

Schema visualizer, auth/roles, jobs, Postgres, realtime, blobs, vectors — Studio S2+ per [[../../feature_list/Jord/03-jord-studio]].
