---
title: "Phase 3 — vectors HTTP on jord-server"
description: "Wire /vectors* routes, validation, write queue"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0014
  - vectors
  - server
---

# Phase 3 — vectors HTTP on jord-server

> Who: **sindri** / **heimdall**.

Sprint: [[README]] · Contract: [[01-contract]]

## Status

**done** (2026-10-24)

## Work

- Implement routes from [[01-contract]]
- Validate namespace, dims, array length, limit
- Mutations via `enqueueWrite`
- Never return raw embedding arrays on list (search hits may omit embedding; optional include flag later)
- Studio BFF `/api/vectors/*`

## Done when

- [ ] Vitest round-trip: upsert → search hits expected id
- [ ] Bad payload → 400; missing → 404
