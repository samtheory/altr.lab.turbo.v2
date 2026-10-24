---
title: "Phase 5 — role gates for policies + triggers"
description: "Reuse canAlterSchema; Studio capability UI; policy 403 vs manage 403"
created: 2026-10-23
updated: 2026-10-23
tags:
  - plan
  - jord
  - Jord-S0009
  - auth
---

# Phase 5 — role gates for policies + triggers

> Who: **heimdall** · **apollo** (Studio capability mirror).

Sprint index: [[README]] · Contract: [[01-security-contract]] · Auth as-built: [[../../../tech_space/jord/04-s0005-auth]]

## Status

**done** (2026-10-23)

## Server

| Guard | Use |
|-------|-----|
| `requireAlterSchema()` (or existing admin schema guard) | POST/PATCH/DELETE `/policies*` and `/triggers*` |
| Policy gate | `/records*` + records-touching function steps — independent of manage |
| Auth on list/get | Any signed-in role (same as other inspect surfaces) |

Reuse **`canAlterSchema`** — do not add `canManagePolicies` / `canManageTriggers` unless verify proves a split is required.

## Studio

- Hide / disable create-edit-enable controls when session cannot alter schema
- Surface policy **403** (`policy_denied`) distinctly from manage **403** (use existing `Alert` patterns)
- Readonly / editor can open panels and read definitions

## Tasks

- [x] Middleware on manage routes
- [x] Studio capability checks
- [x] Tests: editor/readonly cannot manage; admin can; deny policy still applies to editor on `/records`

## Done when

Role matrix in [[01-security-contract]] is enforced in server tests and reflected in Studio UI.
