---
title: "Phase 2 — jord-server schema HTTP routes"
description: "GET schema tables/columns; POST additive ADD COLUMN via write queue"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - jord
  - Jord-S0004
---

# Phase 2 — jord-server schema HTTP routes

> Who: **sindri**. Heimdall: validate DDL inputs; no raw SQL from the client.

Sprint index: [[README]]

## Routes (proposed)

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/schema/tables` | `{ tables: string[] }` |
| `GET` | `/schema/tables/:name` | `{ name, columns: […] }` or 404 |
| `POST` | `/schema/tables/:name/columns` | Body `{ name, type }` → queued `ADD COLUMN`; 400 on bad type/name |

- Reads: direct port calls
- Writes: `enqueueWrite` only
- Reject identifier injection (strict `[a-zA-Z_][a-zA-Z0-9_]*`); type whitelist only

## Status

**done** (2026-10-21)

## Tasks

- [x] Route handlers + tests in `@altr/jord-server`
- [x] Clear errors (unknown table, duplicate column, invalid type)

## Done when

With `dev:jord` up, curl/list describes `records`; a test ADD COLUMN appears on next GET describe.

