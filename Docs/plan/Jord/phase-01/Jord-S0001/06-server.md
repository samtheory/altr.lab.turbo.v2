---
title: "Phase 6 — jord-server routes and WAL checkpoint"
description: "Hono routes for records, a serial write queue, and truncate checkpoints on a timer and on shutdown"
created: 2026-10-18
updated: 2026-10-18
tags:
  - plan
  - jord
  - Jord-S0001
---

# Phase 6 — jord-server routes and WAL checkpoint

> Who: implementer. This is the only process that should take hot writes.

Sprint index: [[README]] · Routes: [[../../../../feature_list/Jord/done/jord-F0001-overview]]

Runtime: Node + Hono + `@hono/node-server` (sprint decision 1). Default port is an env `PORT` with a documented fallback (use `8787` if nothing else in the repo claims it).

## Routes

| Method | Path | Result |
|--------|------|--------|
| `GET` | `/health` | `{ ok: true, dialect: "libsql" }` |
| `POST` | `/records` | `{ bucket, body, metadata? }` → row, `version` 1 |
| `GET` | `/records?bucket=` | Newest first, includes `version` |
| `GET` | `/records/:id` | Row or 404 |
| `PATCH` | `/records/:id` | Body includes `version`. Stale version → **409** and no write. Match → new version |

## Writes and WAL

- Mutations (POST, PATCH) enter one in-process queue so two requests do not write the file at once.
- Every `JORD_WAL_CHECKPOINT_MS` milliseconds (default `60000`), run `PRAGMA wal_checkpoint(TRUNCATE)`.
- On `SIGINT` and `SIGTERM`, run that same pragma, then exit. Do not start a second process to do this.

## Tasks

- [ ] Server boots with `createJordClient`
- [ ] Round-trip test or script: POST then GET by bucket
- [ ] PATCH with a stale `version` returns 409 and the stored version is unchanged
- [ ] Shutdown path calls truncate checkpoint (unit-test the function if a real signal is awkward on Windows)

## Done when

One local process serves the five routes, and the checkpoint function is invoked from both the interval and the signal handlers.
