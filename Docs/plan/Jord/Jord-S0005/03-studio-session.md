---
title: "Phase 3 — Studio session + login"
description: "Replace JORD_STUDIO_OPEN-only gate with login, cookie session, BFF bearer forward"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - jord
  - Jord-S0005
  - jord-studio
  - auth
---

# Phase 3 — Studio session + login

> Who: **mimir → apollo**. Apolyx-first. Server auth from [[02-server-auth]] must exist (or stubbed) so BFF can forward a bearer.

Sprint index: [[README]] · Gate today: `apps/jord-studio/src/lib/studio-gate.ts` · Proxy: `src/lib/jord-proxy.ts`

## Status

**done** (2026-10-21)

## Behavior

1. Add `/login` (Apolyx form): password or operator token → mint HTTP-only session cookie on success.
2. Replace “Studio is gated” as the **only** gate: unauthenticated users land on login; optional keep `JORD_STUDIO_OPEN` as a **dev bypass** documented as lab-only (heimdall must approve if kept).
3. BFF `proxyToJord` attaches `Authorization: Bearer …` from session (or server-side secret held only on the Next server — never expose `JORD_SERVER_TOKEN` to the browser).
4. Logout clears cookie; help page text updates from “set env flag” to “sign in”.
5. Nav: Help item becomes Session / Sign in (or keep Help + add Auth).

## UI constraints

- Compose `@altr/apolyx` only (Input, Button, Alert, Field, …).
- Missing kit control → stop and build in Apolyx with apollo first (unlikely for a login form).
- No Radix / local Dialog inventiveness.

## Tasks

- [ ] Session helpers (sign / verify cookie) in Studio server code
- [ ] Login + logout routes / pages
- [ ] Update `jord-proxy` to forward bearer
- [ ] Update `studio-gate` / layout to require session
- [ ] Refresh help + local banner copy
- [ ] `pnpm --filter @altr/jord-studio typecheck`

## Done when

Operator can open Studio, sign in, browse `/records` and `/schema` through the BFF with upstream auth; signed-out state cannot call mutating BFF routes successfully.
