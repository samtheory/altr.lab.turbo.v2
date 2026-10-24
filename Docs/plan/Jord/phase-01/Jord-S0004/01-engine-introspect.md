---
title: "Phase 1 — schema introspect on JordDriverPort"
description: "listTables / describeTable via sqlite_master + PRAGMA table_info"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - jord
  - Jord-S0004
---

# Phase 1 — schema introspect on JordDriverPort

> Who: **sindri** (impl) · **saga** (types / SQL shape). Studio stays blocked until this exists.

Sprint index: [[README]] · Port: `elements/jord/src/port.ts`

## Behavior

| API | Returns |
|-----|---------|
| `listTables()` | Table names (exclude sqlite internals) |
| `describeTable(name)` | Columns: `name`, `type`, `notnull`, `pk`, `dflt_value` (PRAGMA-shaped) |

- Implement on `LibSqlAdapter` using the existing `client`
- Unit tests against a temp `file:` DB that already has `records`

## Status

**done** (2026-10-21)

## Tasks

- [x] Types on `JordDriverPort` + export
- [x] LibSqlAdapter implementation
- [x] Focused tests in `@altr/jord`

## Done when

`pnpm --filter @altr/jord test` covers introspect; callers can describe `records` without hard-coding columns in Studio.

