---
title: "Phase 3 — session GUCs + policy CRUD sync"
description: "Set jord.role/bucket on Postgres requests; sync RLS after manage routes"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0017
  - server
  - heimdall
---

# Phase 3 — server session + sync

> Who: **sindri** · **heimdall**.

Sprint: [[README]] · Contract: [[01-contract]] · Engine: [[02-engine-compile]]

## Status

**done** (2026-10-24)

## Session binder

| When | Action |
|------|--------|
| Authenticated request that will touch Postgres via `deps.jord` | `setRequestRlsContext({ role, bucket })` |
| libSQL | no-op |

Implementation options (pick one in code; document in as-built):

1. Port method `withSessionContext(ctx, fn)` wrapping a pooled client checkout
2. Lightweight `SET` on the pool connection before each records op (careful with pool reuse — must reset or use transaction-local)

**Prefer** transaction-local `set_config(..., true)` inside existing write-queue transactions and read paths that already hold a client.

## Policy manage routes

After successful create/update/delete of a policy, if Postgres:

```
await deps.enqueueWrite(() => deps.jord.syncRecordsPoliciesRls())
```

Honor `JORD_POLICIES_DISABLED`: skip sync (and middleware already skips).

## Middleware

Unchanged call sites for `evaluatePolicies`. Add a regression test that deny still returns 403 on file: DB; if Postgres test URL present, assert RLS + middleware both deny.

## Done when

- [ ] GUCs set on Postgres request path for role (+ bucket when known)
- [ ] Policy CRUD syncs RLS
- [ ] 403 shape unchanged
