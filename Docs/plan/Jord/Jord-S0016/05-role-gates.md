---
title: "Phase 5 — role gates"
description: "Admin-only DDL; reuse requireAlterSchema"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0016
  - auth
---

# Phase 5 — role gates

> Who: **heimdall** / **apollo**.

Sprint: [[README]]

## Status

**done** (2026-10-24)

## Lock

| Action | Role |
|--------|------|
| List / describe / browse / row R/W | unchanged (S0012 / S0015) |
| CREATE TABLE / ADD COLUMN | `admin` (existing) |
| DROP / RENAME / type change | **`admin` only** via `requireAlterSchema` |

No new role helper required unless Studio wants a named `canAlterSchema` mirror (already exists server-side; Studio should mirror for UI hide).

## Done when

- [ ] Editor PATCH/DELETE schema DDL → 403 in server test
- [ ] Studio hides DDL controls for non-admin
