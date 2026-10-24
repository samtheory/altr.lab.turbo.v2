---
title: "Phase 1 — schema DDL contract"
description: "DROP / RENAME / type-change shapes, errors, reserved rules"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0016
  - contract
---

# Phase 1 — schema DDL contract

> Who: **mimir** / **saga**.

Sprint: [[README]] · Prior create: [[../../../../tech_space/jord/schema]]

## Status

**done** (2026-10-24)

## Lock

| Piece | Choice |
|-------|--------|
| Tables | User tables only. Reserved → 400 `reserved` |
| DROP TABLE | `DELETE /schema/tables/:name` → `{ ok: true }` or 404 / 400 |
| RENAME TABLE | `PATCH /schema/tables/:name` body `{ name: string }` |
| RENAME / TYPE column | `PATCH /schema/tables/:name/columns/:column` body `{ name?: string, type?: JordColumnType }` — at least one field required |
| DROP COLUMN | `DELETE /schema/tables/:name/columns/:column` |
| Errors | `reserved` 400 · `invalid_identifier` 400 · `invalid_type` 400 · `pk_required` 400 · `type_change_failed` 400 · `table_not_found` / `column_not_found` 404 · `table_exists` / `column_exists` 409 |
| Port names | `dropTable` · `renameTable` · `renameColumn` · `dropColumn` · `changeColumnType` (or one `alterColumn` that covers rename+type) |
| `records` / `jord_*` | Untouched; attempts rejected |

## Done when

- [ ] This note matches the routes card and engine method names
