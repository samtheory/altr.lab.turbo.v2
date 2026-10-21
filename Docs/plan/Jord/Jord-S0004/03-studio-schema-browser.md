---
title: "Phase 3 — Studio schema browser + nav"
description: "BFF proxy + Schema page; Database → Schema visualizer becomes live"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - jord
  - Jord-S0004
---

# Phase 3 — Studio schema browser + nav

> Who: **apollo** under mimir. Apolyx-first.

Sprint index: [[README]] · Shell: [[../../../tech_space/jord/02-s0003-studio-shell]]

## UI

- Route e.g. `/schema` (or `/database/schema`)
- List tables; select one → column table (`name`, `type`, `pk`, `notnull`, default)
- Empty / 503 states like records browser
- Update `studio-nav.ts`: Database → Schema visualizer → **live** href (remove soon badge)

## BFF

| Studio | Upstream |
|--------|----------|
| `GET /api/schema/tables` | `GET /schema/tables` |
| `GET /api/schema/tables/:name` | `GET /schema/tables/:name` |

Reuse `jord-proxy.ts`. No `fs` / `@libsql/client` in the app.

## Tasks

- [ ] BFF route handlers
- [ ] Schema browser page composing Apolyx Table / Field / Alert
- [ ] Nav config live link

## Done when

Operator opens Schema from the side nav and sees `records` columns from the running DB.
