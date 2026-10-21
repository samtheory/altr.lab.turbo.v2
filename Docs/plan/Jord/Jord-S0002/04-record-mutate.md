---
title: "Phase 4 — create, detail, OCC patch"
description: "Create record; view/edit with version; surface HTTP 409 on conflict"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - jord
  - Jord-S0002
---

# Phase 4 — create, detail, OCC patch

> Who: **apollo**. OCC semantics stay on `@altr/jord-server`.

Sprint index: [[README]] · OCC: [[../../../tech_space/jord/00-s0001-slice0]]

## Behavior

| Action | API | UI |
|--------|-----|-----|
| Create | `POST /api/records` `{ bucket, body, metadata? }` | Form → list refresh; new row `version` 1 |
| Detail | `GET /api/records/:id` | Show fields including `version` |
| Save | `PATCH` with current `version` | On success, show new `version` |
| Stale save | Server **409** | Message + reload latest row; do not overwrite |

Body editor can be a plain textarea for S1 (JSON string). No Monaco requirement.

## Status

**done** (2026-10-21)

## Tasks

- [x] Create form
- [x] Detail / edit view sending `version`
- [x] 409 conflict UX

## Done when

Manual path: create → edit → save bumps version; a second tab (or forced stale `version`) gets 409 and the stored row is unchanged.
