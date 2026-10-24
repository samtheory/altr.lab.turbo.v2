---
title: "Phase 4 — Studio row editor"
description: "Insert, edit, delete on the user-table grid via BFF"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0015
  - studio
  - apollo
---

# Phase 4 — Studio row editor

> Who: **mimir → apollo**. Apolyx-first. No local kit primitives.

Sprint: [[README]]

## Status

**done** (2026-10-24)

## Work

- BFF proxies the three write routes
- `/tables/[name]`: insert form, edit row, delete row
- `/records` OCC editor untouched
- `/tables/records` still redirects to the records editor

## Done when

- [ ] Operator can add, change, and remove a row on a user table in Studio
