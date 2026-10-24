---
title: "Phase 4 — Studio connection dialect"
description: "Show libsql vs postgres from health; no connection-string form"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0010
  - apollo
  - jord-studio
---

# Phase 4 — Studio connection dialect

> Who: **mimir → apollo**. Apolyx-first. Compose `@altr/apolyx` only.

Sprint index: [[README]] · Contract: [[01-dialect-contract]] · Server: [[03-server-dialect]] · Shell: `apps/jord-studio/src/lib/studio-nav.ts`

## Status

**done** (2026-10-24)

## UI

| Surface | Behavior |
|---------|----------|
| Help or a Database **Connection** item | `live` page that shows dialect (`libsql` or `postgres`) and one line of copy: database URL is process env, not edited here |
| Nav | Add **Connection** under Database, href `/database/connection`, status `live` |
| Data path | BFF `GET /api/health` (already proxied or add it) reads jord-server `/health` |

Do not render host, user, password, or `DATABASE_URL`. Do not add inputs that POST a URL.

Prefer existing Apolyx: `Badge`, `Alert`, `Field` read-only text. Missing control → stop and build it in `elements/ui-kit` first.

## Tasks

- [ ] Page + small panel
- [ ] BFF or existing health proxy
- [ ] Nav item `live`
- [ ] Empty/error state when jord-server is down (same copy pattern as other panels)

## Done when

A signed-in operator can see the dialect the server actually opened, and the page has no way to change it.
