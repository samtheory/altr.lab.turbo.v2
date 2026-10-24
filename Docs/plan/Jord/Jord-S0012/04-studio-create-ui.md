---
title: "Phase 4 — Studio CREATE TABLE UI"
description: "Schema explorer: create table form via Apolyx"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0012
  - apollo
  - jord-studio
---

# Phase 4 — Studio CREATE TABLE UI

> Who: **mimir → apollo**. Apolyx-first. Server: [[03-server-routes]].

Sprint index: [[README]]

## Status

**done** (2026-10-24)

## Goal

Replace the “no CREATE TABLE” dead-end with a working create form on Database → Schema.

## Work

1. BFF proxy `POST /api/schema/tables` → jord-server
2. Form: table name + dynamic column rows (name + type Select) using `@altr/apolyx` only
3. On success: refresh table list and select the new table
4. Role gate UX: admin-only; others see locked Alert (same pattern as ADD COLUMN)
5. Remove / rewrite the v1 copy that forbids CREATE TABLE

## Done when

- [ ] Admin can create a table from Studio without leaving Schema
- [ ] No local Dialog/Select/Button invent; kit only
- [ ] Errors (409 exists, 400 reserved) surface clearly
