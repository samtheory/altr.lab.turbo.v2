---
title: "Phase 3 — server step registry + dispatch routes"
description: "Built-in step kinds, function runner, /x/:slug + manage CRUD routes"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - jord
  - Jord-S0008
---

# Phase 3 — server step registry + dispatch routes

> Who: **sindri**. Writes through `enqueueWrite`. Log invoke summaries into the S5 log ring (`source: "http"` or `"system"`).

Sprint index: [[README]] · Contract: [[01-api-contract]] · Engine: [[02-engine-functions-schema]]

## Status

**done** (2026-10-21)

## Modules (proposed under `cloud/jord/src/`)

| Module | Role |
|--------|------|
| `functions/kinds.ts` | Built-in step handlers |
| `functions/runner.ts` | Execute ordered steps; fail-fast |
| `functions/routes.ts` or wire in `app.ts` | CRUD + invoke + `/x/:slug` |

## HTTP sketch

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/functions` | read |
| `POST` | `/functions` | manage APIs |
| `GET` | `/functions/:id` | read |
| `PATCH` | `/functions/:id` | manage APIs |
| `DELETE` | `/functions/:id` | manage APIs |
| `POST` | `/functions/:id/invoke` | invoke (editor+) |
| `GET` | `/custom-apis` | read |
| `POST` | `/custom-apis` | manage APIs |
| `GET` | `/custom-apis/:id` | read |
| `PATCH` | `/custom-apis/:id` | manage APIs |
| `DELETE` | `/custom-apis/:id` | manage APIs |
| `*` | `/x/:slug` | invoke; method must match row |

Disabled custom → **503**. Missing slug → **404**. Method mismatch → **405**.

## Seed (optional)

One lab function `echo-lab` (`echo` step) + custom `GET /x/echo` enabled — mirrors S5 default jobs seed. Skip if it complicates tests; document either way.

## Tasks

- [x] Step kind registry + runner
- [x] CRUD routes + enable flag
- [x] `/x/:slug` dispatcher
- [x] Wire into `createJordApp`
- [x] Integration tests (403 manage, 503 disabled, invoke echo)

## Done when

`curl`-level flow works: create function → bind custom GET → invoke `/x/…` → disable → 503; all without Studio.
