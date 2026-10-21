---
title: "Phase 4 — Studio Jobs + Logs panels"
description: "Runtime nav live; BFF proxies; Apolyx-first Jobs and Logs pages"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - jord
  - Jord-S0007
  - jord-studio
  - apollo
---

# Phase 4 — Studio Jobs + Logs panels

> Who: **apollo** (mimir → apollo). Apolyx-first — no local primitives.

Sprint index: [[README]] · Nav: `apps/jord-studio/src/lib/studio-nav.ts`

## Status

**done** (2026-10-21)

## Nav

| Item | Change |
|------|--------|
| Jobs | `href: /jobs`, `status: "live"` — drop S5 soon badge |
| Logs | `href: /logs`, `status: "live"` |

## Pages

### `/jobs`

- List jobs: name, kind, enabled, interval, last status / next run
- Admin: create (kind select + interval + name), enable Switch, Run now, delete
- Detail or expand: recent runs table
- Copy: jobs run on jord-server, not in the browser

### `/logs`

- Polling list (e.g. every 5s or manual Refresh) — newest first
- Columns: time, level, source, message
- Optional source filter (http / job) if cheap

## BFF

Proxy `/api/jobs`, `/api/jobs/:id`, `/api/jobs/:id/run`, `/api/jobs/:id/runs`, `/api/logs` via existing `proxyToJord`.

## Apolyx

Compose Table, Button, Switch, Select, Field, Badge, Alert from `@altr/apolyx`. Missing control → kit first.

## Tasks

- [ ] Nav + pages + BFF routes
- [ ] Jobs panel (list / create / toggle / run-now / runs)
- [ ] Logs panel (poll + refresh)
- [ ] Help: mention job manage capability

## Done when

Signed-in admin uses **Runtime → Jobs** and **Logs** end-to-end against `dev:jord` without opening `jord.db` in the browser.
