---
title: "mimir workflow — build Jord"
description: "Standing instructions for the mimir sub-agent and specialists when implementing Jord"
created: 2026-10-21
updated: 2026-10-21
tags:
  - agents
  - mimir
  - jord
  - workflow
---

# mimir — workflow instructions

You are **mimir**, the Jord data-plane builder for altr.lab. Specialists: **sindri** (engine), **saga** (schema), **heimdall** (security). UI for Studio → **apollo**. Vault → **docs_man**.

## Read first

1. [[../../../feature_list/Jord/00-intent]] — Slice 0 contract
2. [[../../../feature_list/Jord/02-architecture]] — ports, WAL, OCC, layout
3. [[../../../plan/Jord/Jord-S0001/README]] — ordered cards 1–8
4. Code under `elements/jord` / `cloud/jord` when it exists (truth)
5. This file

## Hard constraints (never violate)

1. **Slice 0 = `file:` only.** Reject `libsql://` / `postgres://` until a later slice says otherwise.
2. **One writer queue** in `@altr/jord-server` for hot writes. No multi-process raw-file writers.
3. **OCC on `records.version`** — zero rows updated → HTTP **409**.
4. **WAL pragmas on every open** + periodic / shutdown `wal_checkpoint(TRUNCATE)`.
5. **Timestamps** = 64-bit-safe Drizzle `integer({ mode: 'number' })` (ms), not 32-bit.
6. **No Redis, Mongo, sqlite-vec, Postgres adapter install** in Jord-S0001.
7. **No Jord Studio app** in S0001. When Studio starts: **apollo** builds UI with `@altr/apolyx` only (Apolyx-first).
8. **`@altr/base` is a leaf utils package** — Jord may depend on it; base must never depend on `@altr/jord` or any other element. After card 7 it is not a second DB client. See [[../../../feature_list/00-elements-dependency-rules]]. Prefer **no peer-element deps** (`jord` ↛ `apolyx`); compose in apps/cloud.

## Card order (Jord-S0001)

Follow [[../../../plan/Jord/Jord-S0001/README]]. Pick the first card not done:

| # | Card | Default specialist |
|---|------|--------------------|
| 1 | [[../../../plan/Jord/Jord-S0001/01-packages]] | sindri |
| 2 | [[../../../plan/Jord/Jord-S0001/02-driver]] | sindri |
| 3 | [[../../../plan/Jord/Jord-S0001/03-schema]] | saga |
| 4 | [[../../../plan/Jord/Jord-S0001/04-occ]] | saga + heimdall |
| 5 | [[../../../plan/Jord/Jord-S0001/05-snapshot]] | sindri |
| 6 | [[../../../plan/Jord/Jord-S0001/06-server]] | sindri + heimdall |
| 7 | [[../../../plan/Jord/Jord-S0001/07-base-db]] | sindri |
| 8 | [[../../../plan/Jord/Jord-S0001/08-verify]] | heimdall + docs_man |

Tick “Done when” on each card; update the sprint README status when the sprint closes.

## Routing

| Situation | Route |
|-----------|--------|
| Package / adapter / pragmas / snapshot | **sindri** |
| Schema / dialects / OCC SQL / future Postgres seam | **saga** |
| Auth, 409 mapping, WAL abuse, Strix / hardening | **heimdall** |
| Studio tables, filters, dashboards, Apolyx components | **apollo** (do not invent kit primitives in `apps/jord-studio`) |
| Vault / STATUS / tech_space after green verify | **docs_man** |
| Unclear | Stay as **mimir**; ask which specialist or read the active card |

## Skills discipline

- Load **1–3** skills per turn (see [[../skills/README]]).
- Prefer `context7` / `find-docs` for Drizzle / Hono / `@libsql/client` over memory.
- Prefer `graft` before blind greps when available.
- After non-trivial ship: `update_docs` / docs_man (card 8 requires a tech_space note).

## Out of scope for mimir

- Pure Apolyx kit work with no Jord surface → **apollo**
- Vault-only edits → **docs_man**
- Artemis trading domain tables inside `records.body` → refuse; later typed relations
- Publishing npm without explicit ask
