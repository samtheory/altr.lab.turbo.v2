---
title: "Phase 4 — Studio Policies + Triggers panels"
description: "Apolyx Database panels, BFF proxies, nav live; no local primitives"
created: 2026-10-23
updated: 2026-10-23
tags:
  - plan
  - jord
  - Jord-S0009
  - apollo
  - jord-studio
---

# Phase 4 — Studio Policies + Triggers panels

> Who: **mimir → apollo**. Apolyx-first (`.cursor/rules/apolyx-first.mdc`). Compose `@altr/apolyx` only.

Sprint index: [[README]] · Contract: [[01-security-contract]] · Server: [[03-server-enforcement]] · Schema panel precedent: [[../Jord-S0004/README]] · Functions editors: [[../Jord-S0008/04-studio-editors]]

## Status

**done** (2026-10-23)

## Nav

In `apps/jord-studio/src/lib/studio-nav.ts` under **Database**:

| Item | Change |
|------|--------|
| Policies | `soon` → `live`, href `/database/policies` (or `/policies` — pick one path and keep consistent) |
| Triggers | **add** `live`, href `/database/triggers` (same prefix as Policies) |

Schema visualizer stays `live` at `/schema`.

## UI (compose, don’t invent)

| Panel | Must show |
|-------|-----------|
| **Policies** | Table of policies; create (name, operation, effect, priority); edit rules (kind Select + config fields); enable Switch (admin); Save / PATCH; short explain of evaluation order |
| **Triggers** | Table of triggers; create (name, event); edit actions (kind Select + function Select for `invoke_function`); enable Switch (admin); Save / PATCH; note fail-soft AFTER semantics |

Prefer existing Apolyx: `Table`, `Badge`, `Button`, `Switch`, `Field`, `Select`, `Alert`, `Textarea` / JSON field patterns already used on Function APIs. Missing control → **stop** and build in kit via apollo first.

Copy must not teach operators that Jord is a JSON document store — policies/triggers are SQL-backed control-plane rows.

## BFF

Next routes under `apps/jord-studio/src/app/api/` proxy to jord-server (`proxyToJord`). Never open `data/jord.db` from the browser.

## Tasks

- [x] Pages + panels
- [x] BFF CRUD proxies
- [x] Nav `live` (+ Triggers item)
- [x] Role copy for manage vs inspect

## Done when

Admin can create a deny policy that Studio then observes as 403 on `/records`, and create an AFTER insert trigger that logs — with Apolyx-only UI.
