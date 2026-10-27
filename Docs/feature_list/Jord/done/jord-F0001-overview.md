---
title: "jord-F0001 — overview"
feature_id: jord-F0001
description: "Shipped: packages, Slice 0 foundation, migrations, CI, hard invariants"
created: 2026-10-18
updated: 2026-10-27
tags:
  - feature
  - jord
  - done
  - overview
---

# jord-F0001 — overview

> Packages, boot contract, migrations, CI. As-built: [[../../../tech_space/jord/overview/README]]. Open work: [[../INDEX]]. Index: [[README]].

## Packages

| Package | Path | Role |
|---------|------|------|
| `@altr/jord` | `elements/jord` | `JordDriverPort`, adapters, schema, vectors |
| `@altr/jord-server` | `cloud/jord` | HTTP + write queue + WAL + Studio APIs |
| `@altr/jord-client` | `elements/jord-client` | Fetch client (table API + realtime `since`) |
| `@altr/jord-studio` | `apps/jord-studio` | Control plane (Apolyx-first; never opens the DB) |
| `@altr/base` | `elements/base` | Leaf utils only — [[../../00-elements-dependency-rules]] |

## Slice 0 (locked)

| Piece | Decision |
|-------|----------|
| Infra | `data/jord.db` (gitignored); `mkdir -p` parent before open |
| Default URL | `file:./data/jord.db` |
| Pragmas | WAL / `busy_timeout=5000` / `synchronous=NORMAL` |
| Snapshot | `pnpm db:snapshot` |
| Product name | Jord · Studio · `@altr/jord` / `@altr/jord-server` |

Plan: [[../../../plan/Jord/phase-01/Jord-S0001/README|S0001]]. Decisions: [[../../../idea/Jord/2026-10-18-sharpen]].

## Migrations (phase-02 F1)

Forward-only `jord_migrations`; checksum refuse-boot; Postgres advisory lock; baseline frozen. **Done** 2026-10-25 (live Postgres in phase-02.5). Plan: [[../../../plan/Jord/phase-02/Jord-S0021/README|S0021-A]].

## CI (phase-02 F9)

`.github/workflows/jord.yml` — typecheck + tests for jord / jord-server / jord-studio; Postgres + MinIO jobs. **Done**. Plan: [[../../../plan/Jord/phase-02/Jord-S0027/README|S0027]].

## Hard invariants

1. Browser never opens `data/jord.db` or blob paths.
2. Hot writes → one write queue (see [[jord-F0003-writes]]); Postgres concurrency bump is jord-F0013.
3. `records` OCC → 409.
4. WAL / checkpoints only for `file:`.
5. `@altr/base` leaf; Studio = `@altr/apolyx` only.
6. Artemis trading entities never in `records.body`.
7. No new node-gyp / native deps.
8. Every new route: access rule + tests (file always; Postgres via `JORD_TEST_POSTGRES_URL`).
