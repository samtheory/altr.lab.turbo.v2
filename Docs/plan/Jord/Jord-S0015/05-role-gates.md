---
title: "Phase 5 — role gates"
description: "Editor+ writes; readonly browse only"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0015
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
| List / browse rows | any authenticated |
| Insert / update / delete | `editor` or `admin` |
| CREATE TABLE | stays `admin` (S0012) |

Studio hides write controls for `readonly`. Server still returns 403.

## Done when

- [ ] Readonly PUT/PATCH/DELETE → 403 in server test
- [ ] Studio write controls follow the same rule
