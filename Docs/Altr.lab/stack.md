---
title: "Stack decisions"
description: "Turso/libSQL primary DB; when to use PocketBase, Postgres, Mongo"
created: 2026-09-19
updated: 2026-10-11
tags:
  - altr-lab
  - stack
---

# Stack

| Layer | Choice |
|-------|--------|
| Frontends | React / Next.js (`apps/*`) + Tailwind + Apolyx via `@altr/apolyx` |
| API | Hono + Bun (`cloud/hono-server`) |
| Primary DB | **Turso (libSQL)** — SQLite-compatible, local file for zero-infra dev |
| Optional | PocketBase for quick admin UI + auth (e.g. Stashly-style apps) |
| Later | Postgres only if FTS at scale, JSONB, or pgvector SLAs; Mongo only if needed |

## Why Turso / libSQL

- Local file for side-project speed
- One Turso dashboard across projects
- Same driver on VPS via libsql-server
- Relational fit for trading bots (positions, orders, signals)
- Vector via sqlite-vec / sqlite-vss when needed
- AI tooling (LangChain, LlamaIndex, Vercel AI SDK) has SQLite adapters

Shared stubs: `elements/base` (`db`, `env`, `errors`, `auth`, `query`, `ai`).
