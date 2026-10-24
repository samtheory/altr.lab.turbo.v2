---
title: "Phase 3 — jord-server env + WAL gate"
description: "Pass-through DATABASE_URL; skip WAL hygiene for remote libsql"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0019
  - sindri
  - heimdall
---

# Phase 3 — jord-server env + WAL gate

> Who: **sindri** · **heimdall**. Sprint: [[README]].

## Status

**done** (2026-10-24)

## Touch

| File | Change |
|------|--------|
| `cloud/jord/src/index.ts` | WAL hygiene only when **file** libSQL (not every `dialect === "libsql"`); boot log `urlScheme` without host |
| `cloud/jord/src/app.ts` | Optional `/health.urlScheme`; never echo URL/token |
| `cloud/jord/.env.example` | Document `DATABASE_URL=libsql://…` + `LIBSQL_AUTH_TOKEN` / `TURSO_AUTH_TOKEN` |
| Root / studio env examples | Align naming if they still imply base-owned Turso only |

## WAL gate (locked)

Today:

```ts
const useWal = jord.dialect === "libsql";
```

Becomes something equivalent to:

```ts
const useWal = jord.dialect === "libsql" && urlScheme === "file";
```

`createJordClient` already reads `env.DATABASE_URL`; token comes from process env inside the adapter — server does not re-implement auth.

## Heimdall checks

- Boot log: `dialect=libsql scheme=libsql` (or `file`) — no hostname, no token
- Error paths: do not stringify full `DATABASE_URL` with credentials if any ever appear (tokens stay out of URL by contract)

## Done when

- [ ] Remote boot does not run WAL checkpoint loops
- [ ] `.env.example` documents hosted path
- [ ] `/health` remains secret-free
