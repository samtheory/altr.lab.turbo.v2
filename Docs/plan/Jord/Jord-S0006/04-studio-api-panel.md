---
title: "Phase 4 — Studio Generated API panel"
description: "APIs nav live; catalog UI, copy curl, try-it, admin toggle via BFF"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - jord
  - Jord-S0006
  - jord-studio
  - apollo
---

# Phase 4 — Studio Generated API panel

> Who: **apollo** (mimir → apollo). Apolyx-first — no local Dialog/Select/Table primitives.

Sprint index: [[README]] · Nav: `apps/jord-studio/src/lib/studio-nav.ts`

## Status

**done** (2026-10-21)

## UI

| Piece | Behavior |
|-------|----------|
| Nav | `Generated API` → `href: /apis/generated`, `status: "live"` (drop `soon` / S4 badge) |
| Page | One composition: resource list → selected resource detail (ops table + enable switch) |
| Ops | Method badge, path, summary, auth need; **Copy curl** (includes note that Studio BFF path may differ from raw jord-server) |
| Try-it | Optional minimal form for GET list (`bucket`) and GET by id — reuse existing BFF `/api/records*` where possible |
| Toggle | Switch for `enabled`; only interactive for `admin` (see [[05-role-gates]]) |
| Copy | Do not teach operators that Jord is a JSON document DB; paths are SQL table CRUD |

## BFF

| Route | Upstream |
|-------|----------|
| `GET /api/apis/generated` | jord-server `GET /apis/generated` |
| `GET /api/apis/generated/:resource` | … |
| `PATCH /api/apis/generated/:resource` | … (forward body + bearer) |

Reuse existing proxy / session attachment from S3. Do not open `jord.db` from the browser.

## Apolyx

Compose from `@altr/apolyx` only. If a control is missing (e.g. Switch already shipped in Apolyx-S0003), consume it. Missing kit piece → stop and build in kit with apollo first.

## Tasks

- [x] Nav + `/apis/generated` page
- [x] BFF proxy routes
- [x] Catalog fetch + ops list + copy curl
- [x] Admin toggle wired to PATCH
- [x] Help blurb on `/help` or inline: generated vs custom (S6)

## Done when

Signed-in operator opens **APIs → Generated API**, sees `records` ops, copies curl, and (as admin) can flip enabled and observe list failure with contracted status.
