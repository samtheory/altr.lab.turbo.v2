---
title: "Phase 5 — role gates for generated API"
description: "Align catalog/toggle/DELETE with S3 admin/editor/readonly"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - jord
  - Jord-S0006
  - auth
---

# Phase 5 — role gates for generated API

> Who: **heimdall** (server) · **apollo** (Studio UI disable states).

Sprint index: [[README]] · S3 as-built: [[../../../tech_space/jord/04-s0005-auth]]

## Status

**done** (2026-10-21)

## Matrix

| Action | readonly | editor | admin |
|--------|----------|--------|-------|
| View catalog / ops | yes | yes | yes |
| Try-it GET | yes | yes | yes |
| Try-it POST/PATCH/DELETE | 403 | yes* | yes* |
| Toggle resource enabled | 403 | 403 | yes |

\* Still blocked if resource disabled (503) or S3 write rules fail.

## Studio UX

- Toggle control **disabled** (not hidden) for non-admin, with short helper text
- Delete / mutate try-it controls hidden or disabled for readonly (same pattern as Insert row)

## Tasks

- [x] Server tests: readonly PATCH catalog → 403; editor PATCH → 403; admin → 200
- [x] Studio: gate toggle via `canManageApis` (admin)
- [x] Document on `/help` capability list

## Done when

Role matrix above is proven by tests + one manual Studio pass per role.
