---
title: "Phase 5 — live save ADD COLUMN"
description: "Preview SQL and apply additive column via BFF → write queue"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - jord
  - Jord-S0004
---

# Phase 5 — live save ADD COLUMN

> Who: **saga** (DDL rules) · **apollo** (form) · server already from card 2.

Sprint index: [[README]]

## Behavior

1. On Schema page for table T: form **Add column** — `name`, `type` (whitelist)
2. Show **SQL preview**: `ALTER TABLE "T" ADD COLUMN "name" TYPE;`
3. Confirm → `POST /api/schema/tables/:name/columns` → server apply
4. On success, refresh describe + visualizer
5. On failure, show server error (duplicate column, etc.)

## Hard limits (this sprint)

- No DROP / RENAME / CREATE TABLE / indexes UI
- Identifiers validated server-side (never trust preview-only)
- Still local-dev gate; no multi-tenant auth

## Tasks

- [ ] Studio form + preview + apply
- [ ] BFF POST proxy
- [ ] Manual path documented in README

## Done when

Additive column lands in `data/jord.db` and appears in introspect without restarting Studio (server may keep connection open — re-PRAGMA after DDL).
