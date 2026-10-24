---
title: "Phase 3 — server schema create + rows"
description: "POST /schema/tables + generic row list; role gates"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0012
  - sindri
  - heimdall
---

# Phase 3 — server schema create + rows

> Who: **sindri** (routes) · **heimdall** (gates). Engine: [[02-engine-create-table]].

Sprint index: [[README]]

## Status

**done** (2026-10-24)

## Goal

Expose create + safe row browse on `@altr/jord-server`.

## Work

1. `POST /schema/tables` + `requireAlterSchema()` → `enqueueWrite(() => jord.createTable(…))`
2. `GET /schema/tables/:name/rows` with limit/offset caps (e.g. max 100) — reject reserved system tables if needed; validate ident
3. Map engine errors → 400 / 404 / 409
4. App tests covering create + list rows + forbidden role

## Done when

- [ ] Routes match [[01-contract]]
- [ ] Writes only on the queue
- [ ] `readonly` cannot create; can list/browse per existing auth model
