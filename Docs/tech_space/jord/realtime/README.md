---
title: "Jord — realtime"
description: "Transactional outbox CDC over SSE and WebSocket; resume with since; tracked tables only"
created: 2026-10-24
updated: 2026-10-25
tags:
  - tech-space
  - jord
  - realtime
  - cdc
---

# Jord — realtime

> Who: anyone subscribing to row changes. Writes that emit: [[../writes/README]]. Select policy: [[../policies/README]].

## Why

Studio grids should refresh after a successful mutation without polling. Phase-02 replaces the phase-01 in-process producer with a transactional outbox so clients can resume without skipping rows.

## What

**Single emit path.** Every server write to a **tracked** table goes through one helper, `writeChangeAs(principal)` in `cloud/jord/src/app.ts`. Inside the write queue it opens `jord.transaction`, runs the data write, inserts the `jord_changes` row(s) (`outbox.appendChange`, the only `INSERT INTO jord_changes` in the source; a test greps for this), and commits. Only after commit does it publish `jord.change`. If the outbox insert fails, the data write rolls back and the request fails (5xx). Callers: Studio rows, `/records`, `/api/v1/:table` (using the `RETURNING` rows for `new` / `old`), functions (`records_insert`), triggers, and `/x/:slug`. Event name stays `jord.change`. Payload: `type`, `table`, `op`, `id`, `version?`, `at`, `dialect`, plus `seq` for resume.

| Piece | Detail |
|-------|--------|
| Tables | `jord_changes(seq, table_name, op, pk, old_json, new_json, actor, ts)`, `jord_tracked_tables` |
| Indexes | `(seq)` and `(table_name, seq)` |
| Opt-in | Capture only for tracked tables. `records` is seeded tracked. `CREATE TABLE` marks the new table tracked. `PUT /schema/tables/:name/track` `{ tracked }` toggles |
| Retention | Default **7 days** and **100_000** rows (`JORD_CHANGES_RETENTION_DAYS`, `JORD_CHANGES_RETENTION_ROWS`). Job kind `changes_prune` |
| Resume | `GET /realtime?table=&since=` — catch up then live. `since` older than the retained range → **410** `{ error: "gone", hint: "resync" }` |
| Watermark | `appendChange` marks the seq in flight; the helper settles it after commit or rollback. Readers see `MAX(seq)`, held below the lowest seq still in flight in this process. Postgres BIGSERIAL can commit out of order; a live test proves a higher seq is not readable until the lower one commits |
| Fan-out | In-process bus. A Postgres trigger sends `pg_notify('jord_changes', seq)`, but nothing `LISTEN`s yet. Multi-instance fan-out is phase-03 |
| Policy | Filter at delivery (catchup and live) using the subscriber's select policy and row scope on the **new** row (**old** for deletes) |
| BLOBs | Omitted from outbox JSON as `{ "$blob": true }` |
| Cap | **48** shared SSE+WS subscribers → **503** `realtime_full` |

| Transport | Path | Notes |
|-----------|------|-------|
| SSE | `GET /realtime?table=&id=&since=` | `text/event-stream`; ping every 15s |
| WebSocket | `GET /realtime/ws?table=&id=` | same JSON; `{type:"ping"}` every 15s |

Any authenticated principal may subscribe, including `user` and `anon`. When the access token `exp` passes, SSE emits `expired` and ends; WebSocket closes with **4401**.

### Not captured

- **Raw SQL** from the Studio SQL console and the migrate wizard. Only writes through the paths above insert into `jord_changes`. Studio Help documents the gap.
- **Hosted `libsql://`.** `jord.transaction` runs without a transaction there (the remote client has no shared connection), so data and outbox are written in order but not atomically.
- `/api/v1` PATCH emits `old: null` (the update does not read the prior row).

## How

| Piece | Path |
|-------|------|
| Write helper | `writeChangeAs` in `cloud/jord/src/app.ts` · type `WriteWithChange` in `cloud/jord/src/realtime/types.ts` |
| Outbox | `cloud/jord/src/realtime/outbox.ts` |
| Watermark | `cloud/jord/src/realtime/watermark.ts` |
| Bus (fanout only) | `cloud/jord/src/realtime/bus.ts` |
| Transaction | `JordDriverPort.transaction` (libSQL `BEGIN IMMEDIATE` on the shared connection; Postgres one pooled client with the session GUCs) |
| Migration | `elements/jord/migrations/{libsql,postgres}/0004_outbox.sql` |
| Tests | `cloud/jord/src/realtime/outbox.test.ts` (file + live Postgres) |

## Example

Open `GET /realtime?table=notes` with a bearer, then `POST /schema/tables/notes/rows`. The stream receives one `jord.change` with `"op":"insert"` and `"table":"notes"`. A PATCH that 409s produces no event. After prune, `GET /realtime?since=1` can return **410** with `hint: "resync"`.

## Not in Jord yet

`LISTEN` fan-out across instances · SQLite update hooks · Turso external-writer capture · multi-node presence · Redis fanout
