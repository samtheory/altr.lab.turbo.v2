---
title: "Phase 5 — role gates for custom + function APIs"
description: "Mirror canManageApis; Studio capability UI; invoke rules"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - jord
  - Jord-S0008
  - auth
---

# Phase 5 — role gates for custom + function APIs

> Who: **heimdall** · **apollo** (Studio capability mirror).

Sprint index: [[README]] · Contract: [[01-api-contract]] · Auth as-built: [[../../../tech_space/jord/04-s0005-auth]]

## Status

**done** (2026-10-21)

## Server

| Guard | Use |
|-------|-----|
| `requireManageApis()` | POST/PATCH/DELETE functions + custom-apis |
| Auth + invoke policy | `/functions/:id/invoke` and `/x/:slug` per contract (editor+; readonly 403) |
| Write steps | Still check `canWriteRecords` inside runner for `records_insert` |

Reuse `canManageApis` — do not add `canManageCustomApis` unless verify proves a split is required.

## Studio

- Hide / disable create-edit-enable controls when session lacks manage-APIs
- Hide Invoke for readonly
- Surface 403 / 503 with existing `Alert` patterns

## Tasks

- [x] Middleware on new routes (`requireManageApis` / `requireInvokeApis`)
- [x] Studio capability checks
- [x] Tests: readonly cannot manage or invoke; editor cannot manage; admin can

## Done when

Role matrix in [[01-api-contract]] is enforced in server tests and reflected in Studio UI.
