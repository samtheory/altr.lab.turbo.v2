---
title: "Phase 4 — Studio schema DDL UI"
description: "Drop/rename/type controls on schema explorer via BFF"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0016
  - studio
  - apollo
---

# Phase 4 — Studio schema DDL UI

> Who: **mimir → apollo**. Apolyx-first. No local kit primitives.

Sprint: [[README]]

## Status

**done** (2026-10-24)

## Work

- BFF proxies the four DDL routes
- Schema explorer (or table detail): rename table, drop table (confirm), rename column, change type, drop column (confirm)
- After drop table → navigate back to `/tables` or schema list
- After rename table → update URL / selection to new name
- Hide controls unless session role can alter schema (`admin`)
- Use `@altr/apolyx` (`Button`, `Field`, `FieldInput`, `Alert`, dialog/confirm if already in kit — otherwise simple confirm pattern already used in Studio)

## Done when

- [ ] Admin can drop, rename, and type-change from Studio; readonly/editor see no controls
