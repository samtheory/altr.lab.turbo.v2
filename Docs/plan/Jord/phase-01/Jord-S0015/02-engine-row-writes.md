---
title: "Phase 2 — engine row writes"
description: "Port methods on LibSQL and Postgres for user-table DML"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0015
  - engine
---

# Phase 2 — engine row writes

> Who: **saga** / **sindri**.

Sprint: [[README]]

## Status

**done** (2026-10-24)

## Work

- `insertTableRow` / `updateTableRow` / `deleteTableRow` on `JordDriverPort`
- Both adapters; parameterized SQL; identifier allow-list from `describeTable`
- Reject reserved names before SQL

## Done when

- [ ] Engine test: create user table, insert, update, delete, duplicate PK fails, reserved name fails
