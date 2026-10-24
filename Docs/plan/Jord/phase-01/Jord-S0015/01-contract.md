---
title: "Phase 1 — user-table write contract"
description: "PK identity, reserved names, HTTP shape, error codes"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0015
  - contract
---

# Phase 1 — user-table write contract

> Who: **mimir** / **saga**.

Sprint: [[README]] · Prior browse: [[../../../../tech_space/jord/schema]]

## Status

**done** (2026-10-24)

## Lock

| Piece | Choice |
|-------|--------|
| Tables | User tables only. Reserved → 400 `reserved` |
| PK | The single PK from CREATE TABLE. Path param is the PK value (text-encoded) |
| Insert body | `{ values: { col: scalar } }` — every non-nullable column required except defaults none in v1 |
| Update body | `{ values: { col: scalar } }` — patch; PK in body ignored or must match path |
| Null | JSON `null` allowed only if column is nullable (v1: all non-PK columns nullable) |
| Duplicate PK | 409 `pk_exists` |
| Missing row | 404 |
| Type mismatch | 400 `bad_value` |
| `records` | Unchanged OCC `/records` |

## Done when

- [ ] This note matches the routes card and engine method names
