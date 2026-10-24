---
title: "Phase 2 — jord-server auth middleware"
description: "Bearer validation + role checks on records and schema routes"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - jord
  - Jord-S0005
  - auth
---

# Phase 2 — jord-server auth middleware

> Who: **sindri** (wire into Hono app) · **heimdall** (401/403 + tests for abuse). Contract: [[01-auth-contract]].

Sprint index: [[README]] · Code: `cloud/jord/src/app.ts`

## Status

**done** (2026-10-21)

## Behavior

1. Read `JORD_SERVER_TOKEN` (fail closed in non-dev if missing — document exact rule).
2. Middleware parses `Authorization: Bearer <token>` (and optionally a documented alternate header).
3. Resolve role from bootstrap map (token → role, or single token with `JORD_DEFAULT_ROLE`).
4. Apply to `/records` and `/schema/*` (all methods). Leave `GET /health` open.
5. Reject missing/invalid → **401**; wrong role for mutation/schema → **403**.
6. Keep write queue + OCC behavior unchanged after auth passes.

## Tasks

- [ ] Auth middleware module in `cloud/jord`
- [ ] Role helper (`canWriteRecords`, `canAlterSchema`)
- [ ] Wire into `app.ts` before route handlers
- [ ] Unit/integration tests: 401 without token; editor blocked from ADD COLUMN; admin allowed
- [ ] Update `cloud/jord` README env table

## Done when

`pnpm --filter @altr/jord-server test` proves protected routes reject anonymous traffic and enforce roles; health still works without a token.
