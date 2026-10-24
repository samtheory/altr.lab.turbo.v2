---
title: "Phase 3 — server DDL routes"
description: "Write-queue HTTP for drop/rename/type"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0016
  - server
---

# Phase 3 — server DDL routes

> Who: **sindri** / **heimdall**.

Sprint: [[README]]

## Status

**done** (2026-10-24)

## Routes

| Method | Path | Body | Notes |
|--------|------|------|--------|
| `DELETE` | `/schema/tables/:name` | — | drop table |
| `PATCH` | `/schema/tables/:name` | `{ name }` | rename table |
| `PATCH` | `/schema/tables/:name/columns/:column` | `{ name?, type? }` | rename and/or type |
| `DELETE` | `/schema/tables/:name/columns/:column` | — | drop column |

All through `enqueueWrite` + `requireAlterSchema()`. Map planner errors to 400 / 404 / 409.

Existing: `POST /schema/tables`, `POST …/columns`, GET describe / list — unchanged.

## Done when

- [ ] Server test: admin drop/rename/type + reserved 400 + missing 404 + editor/readonly 403
