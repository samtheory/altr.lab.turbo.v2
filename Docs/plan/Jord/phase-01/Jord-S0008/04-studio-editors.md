---
title: "Phase 4 — Studio Custom + Function API editors"
description: "Apolyx panels, BFF proxies, nav live; no local primitives"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - jord
  - Jord-S0008
  - apollo
---

# Phase 4 — Studio Custom + Function API editors

> Who: **mimir → apollo**. Apolyx-first (`.cursor/rules/apolyx-first.mdc`). Compose `@altr/apolyx` only.

Sprint index: [[README]] · Contract: [[01-api-contract]] · Server: [[03-server-dispatcher]] · S4 panel precedent: Generated API panel

## Status

**done** (2026-10-21)

## Nav

In `studio-nav.ts`:

| Item | Change |
|------|--------|
| Custom APIs | `soon` → `live`, href `/apis/custom` |
| Function APIs | `soon` → `live`, href `/apis/functions` |

## UI (compose, don’t invent)

| Panel | Must show |
|-------|-----------|
| **Functions** | Table of functions; create (name/slug); edit steps (kind Select + config JSON/fields); enable Switch (admin); Save / live PATCH; Invoke try-it |
| **Custom APIs** | Table: method, slug, linked function, enabled; create/edit; copy curl for `/x/:slug` via BFF; admin Switch |

Prefer existing Apolyx: `Table`, `Badge`, `Button`, `Switch`, `Field`, `Select`, `Alert`, `Textarea` (if present). Missing control → **stop** and build in kit via apollo first.

## BFF

Next routes under `apps/jord-studio/src/app/api/` proxy to jord-server (`proxyToJord`). Never open `data/jord.db` from the browser.

## Tasks

- [x] Pages + panels
- [x] BFF CRUD + invoke proxies
- [x] Nav `live`
- [x] Role copy in panels for manage vs invoke

## Done when

Admin can create a function, bind a custom route, invoke from Studio, and disable — with Apolyx-only UI.
