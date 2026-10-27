---
title: "Stack decisions"
description: "libSQL file first; PocketBase optional; Postgres and hosted Turso later"
created: 2026-09-19
updated: 2026-10-21
tags:
  - altr-lab
  - stack
  - Jord-S0001
---

# Stack

| Layer | Choice |
|-------|--------|
| Frontends | React / Next.js. Today that is the Apolyx docs app (`apps/apolyx`) plus Tailwind and `@altr/apolyx` |
| API | Hono on Node (`engines.node` >= 20). `@altr/jord-server` in `cloud/jord` (default port 8787) |
| Primary DB | **Jord** — libSQL file `data/jord.db` via `@altr/jord`. Drizzle on libSQL. Intent: [[../feature_list/Jord/done/jord-F0001-overview]] · as-built: [[../tech_space/jord/overview]] · layout: [[../feature_list/Jord/done/jord-F0002-dialects]] |
| Studio | Planned `@altr/jord-studio` in `apps/jord-studio` — [[../feature_list/Jord/done/jord-F0012-studio]] |
| Optional | PocketBase for a quick admin side path. It is not Jord |
| Later | Hosted Turso URL, then Postgres as a second Drizzle driver. Plugins need dialect adapters. See [[../feature_list/Jord/INDEX]] |

## Why a libSQL file first

- The database is a file you copy. No hosted account for the first slice
- Same `@libsql/client` talks to Turso later by changing `DATABASE_URL`
- Relational fit for a future Artemis bot (rows in a bucket on this file)
- Vector via sqlite-vec on this file when retrieval is in scope (dialect adapter, not a free Drizzle switch)
- Table CRUD ports to Postgres through Drizzle; triggers, policies, and extensions stay dialect-aware ([[../feature_list/Jord/done/jord-F0002-dialects]])

Jord-S0001 shipped 2026-10-21: `@altr/jord` + `@altr/jord-server`. `@altr/base/db` only redirects callers to Jord (leaf utils; no live client).

Shared utils: `elements/base` (`env`, `errors`, `auth`, `query`, `ai`, deprecated `db` redirect).
