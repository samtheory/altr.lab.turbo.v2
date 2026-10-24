---
title: "Phase 3 — server row routes"
description: "Write-queue HTTP for user-table rows"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0015
  - server
---

# Phase 3 — server row routes

> Who: **sindri** / **heimdall**.

Sprint: [[README]]

## Status

**done** (2026-10-24)

## Routes

| Method | Path | Notes |
|--------|------|--------|
| `POST` | `/schema/tables/:name/rows` | insert |
| `PATCH` | `/schema/tables/:name/rows/:pk` | update |
| `DELETE` | `/schema/tables/:name/rows/:pk` | delete |

Mutations go through `enqueueWrite`. Browse `GET …/rows` stays.

## Done when

- [ ] Server test covers happy path + 400/404/409 + reserved
