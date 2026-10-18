---
title: "Stack decisions"
description: "libSQL file first; PocketBase optional; Postgres and hosted Turso later"
created: 2026-09-19
updated: 2026-10-18
tags:
  - altr-lab
  - stack
---

# Stack

| Layer | Choice |
|-------|--------|
| Frontends | React / Next.js. Today that is the Apolyx docs app (`apps/apolyx`) plus Tailwind and `@altr/apolyx` |
| API | Hono. Jord-S0001 boots on Node (`engines.node` >= 20). Bun is not required for that sprint. No API package is in `cloud/` until `cloud/jord` is implemented |
| Primary DB | **Jord** — libSQL file `data/jord.db`. Drizzle on libSQL first. Intent: [[../feature_list/Jord/00-intent]] · layout: [[../feature_list/Jord/02-architecture]] |
| API | Planned `@altr/jord-server` in `cloud/jord` (not in the tree yet) |
| Studio | Planned `@altr/jord-studio` in `apps/jord-studio` — [[../feature_list/Jord/03-jord-studio]] |
| Optional | PocketBase for a quick admin side path. It is not Jord |
| Later | Hosted Turso URL, then Postgres as a second Drizzle driver. Plugins need dialect adapters. See [[../feature_list/Jord/01-later]] |

## Why a libSQL file first

- The database is a file you copy. No hosted account for the first slice
- Same `@libsql/client` talks to Turso later by changing `DATABASE_URL`
- Relational fit for a future Artemis bot (rows in a bucket on this file)
- Vector via sqlite-vec on this file when retrieval is in scope (dialect adapter, not a free Drizzle switch)
- Table CRUD ports to Postgres through Drizzle; triggers, policies, and extensions stay dialect-aware ([[../feature_list/Jord/02-architecture]])

`@altr/jord` and `data/jord.db` do not exist until Jord-S0001 is implemented. `@altr/base/db` is still a stub.

Shared stubs today: `elements/base` (`db`, `env`, `errors`, `auth`, `query`, `ai`).
