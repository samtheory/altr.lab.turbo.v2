---
title: "Phase 2 — engine createTable"
description: "JordDriverPort.createTable + libSQL / Postgres DDL helpers"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0012
  - saga
  - sindri
---

# Phase 2 — engine createTable

> Who: **saga** (DDL) · **sindri** (adapters / queue-safe call). Contract: [[01-contract]].

Sprint index: [[README]]

## Status

**done** (2026-10-24)

## Goal

Add `createTable` to `JordDriverPort` and implement on `LibSqlAdapter` + `PostgresAdapter`.

## Work

1. Types: `CreateTableInput` / `CreateTableResult` (`ok` | `table_exists` | `invalid_ident` | `reserved` | …)
2. `buildCreateTableSql` in `elements/jord/src/schema/ddl.ts` (dialect-aware or two builders)
3. Adapter methods run DDL; never from browser
4. Unit tests: happy path, duplicate name, reserved name, bad ident — both dialects where tests already exist

## Done when

- [ ] Port + both adapters export working `createTable`
- [ ] Reserved / invalid paths return typed errors (no raw SQL injection via names)
- [ ] Package tests green
