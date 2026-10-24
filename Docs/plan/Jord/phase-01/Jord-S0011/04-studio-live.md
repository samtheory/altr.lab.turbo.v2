---
title: "Phase 4 — Studio live subscriptions UI"
description: "Subscribe in jord-studio; refresh records browse on jord.change"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0011
  - apollo
  - jord-studio
---

# Phase 4 — Studio live subscriptions UI

> Who: **mimir → apollo**. Depends on [[03-server-sse]]. Apolyx-first.

Sprint index: [[README]] · Studio intent: [[../../../../feature_list/Jord/03-jord-studio]]

## Status

**done** (2026-10-24)

## Goal

In `apps/jord-studio`, let an operator turn on live updates for the `records` table editor / browse surface:

- Connect via BFF/proxy to the server SSE (browser never hits raw DB)
- On `jord.change`, revalidate or patch the visible rows
- Clear connected / reconnecting / error state using `@altr/apolyx` only

## UI notes

- Prefer a single “Live” control near the table toolbar (not a new dashboard card sprawl)
- Missing kit control → stop and build in `elements/ui-kit` with apollo first

## Done when

- [ ] Two Studio tabs (or one Studio + mutate via API): mutate in one → other updates without full reload
- [ ] Toggle off stops the EventSource / fetch stream
- [ ] No local Radix / Base UI / invented primitives in the app
