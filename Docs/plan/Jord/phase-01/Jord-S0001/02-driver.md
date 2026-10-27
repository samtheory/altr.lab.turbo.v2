---
title: "Phase 2 — JordDriverPort and LibSqlAdapter"
description: "file: client that mkdirs data/, applies WAL pragmas, and rejects other URL schemes"
created: 2026-10-18
updated: 2026-10-18
tags:
  - plan
  - jord
  - Jord-S0001
---

# Phase 2 — JordDriverPort and LibSqlAdapter

> Who: implementer. Schema is card 3. This card opens the file.

Sprint index: [[README]] · Contract: [[../../../../feature_list/Jord/done/jord-F0002-dialects]]

## Surface

App code depends on `JordDriverPort` (open, execute through the Drizzle client, close). `LibSqlAdapter` is the only class this sprint installs.

`createJordClient({ url })`:

| Step | Behavior |
|------|----------|
| Default URL | `process.env.DATABASE_URL` or `file:./data/jord.db` |
| Scheme | `file:` continues. `libsql:`, `postgres:`, `postgresql:`, anything else throws an error that says Slice 0 accepts only `file:` |
| Directory | Recursively create the parent of the file (`data/` for the default) before open |
| Pragmas | On every open: `journal_mode = WAL`, `busy_timeout = 5000`, `synchronous = NORMAL` |
| Postgres | No `PostgresAdapter` module that imports a Postgres driver. A typed "not in Slice 0" branch is enough |

## Tasks

- [ ] Port + `LibSqlAdapter` + `createJordClient`
- [ ] Test: missing `data/` is created; pragmas read back WAL / 5000 / NORMAL
- [ ] Test: a `postgres:` URL throws and names the Slice 0 limit

## Done when

A test process can open `file:./data/jord.db` on a clean tree (directory absent) and close it. The file may be deleted in test teardown; it must not be committed.
