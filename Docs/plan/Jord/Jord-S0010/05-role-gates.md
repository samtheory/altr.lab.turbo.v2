---
title: "Phase 5 — connection page role gates"
description: "Inspect dialect for any signed-in role; no manage action to add"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0010
  - auth
---

# Phase 5 — connection page role gates

> Who: **heimdall** · **apollo**.

Sprint index: [[README]] · Contract: [[01-dialect-contract]] · Auth: [[../../../tech_space/jord/04-s0005-auth]]

## Status

**done** (2026-10-24)

## Rules

| Action | readonly | editor | admin |
|--------|----------|--------|-------|
| See dialect on the connection page | yes | yes | yes |
| Change `DATABASE_URL` from Studio | no | no | no |

`/health` stays unauthenticated (it already is) and must not grow secrets if Studio reads it. If a new `/meta` route is added, it uses the existing auth middleware and still omits the URL.

Do not add `canManageConnection`.

## Tasks

- [ ] Confirm health JSON has no URL parts
- [ ] Studio page available to every signed-in role
- [ ] Test or review note: readonly session can load the page

## Done when

No role can read or set the database URL through Studio, and every role can see the dialect.
