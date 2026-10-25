---
title: "Jord — realtime"
description: "Outbox CDC over SSE and WebSocket; resume with since; tracked tables only"
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

**Single emit path:** API (and function) writes that touch a **tracked** table insert into `jord_changes` and then fan out `jord.change`. There is no second direct-to-bus path. Event name stays `jord.change` so Studio subscribers stay valid. Payload still has `type`, `table`, `op`, `id`, `version?`, `at`, `dialect`, plus optional `seq` for resume.

| Piece | Detail |
|-------|--------|
| Tables | `jord_changes(seq, table_name, op, pk, old_json, new_json, actor, ts)`, `jord_tracked_tables` |
| Indexes | `(seq)` and `(table_name, seq)` |
| Opt-in | Capture only for tracked tables. `records` is seeded tracked. `CREATE TABLE` marks the new table tracked. `PUT /schema/tables/:name/track` `{ tracked }` toggles |
| Retention | Default **7 days** and **100_000** rows (`JORD_CHANGES_RETENTION_DAYS`, `JORD_CHANGES_RETENTION_ROWS`). Job kind `changes_prune` |
| Resume | `GET /realtime?table=&since=` — catch up then live. `since` older than the retained range → **410** `{ error: "gone", hint: "resync" }` |
| Watermark | libSQL: write-queue order; readable watermark is `MAX(seq)`. Postgres: withhold seqs above an in-flight lower seq; `pg_notify` payload is **seq only** |
| Policy | Filter at delivery (catchup and live) using the subscriber's select policy on the **new** row ( **old** for deletes) |
| BLOBs | Omitted from outbox JSON as `{ "$blob": true }` |
| Cap | **48** shared SSE+WS subscribers → **503** `realtime_full` |

| Transport | Path | Notes |
|-----------|------|-------|
| SSE | `GET /realtime?table=&id=&since=` | `text/event-stream`; ping every 15s |
| WebSocket | `GET /realtime/ws?table=&id=` | same JSON; `{type:"ping"}` every 15s |

Any authenticated principal may subscribe, including `user` and `anon`. When the access token `exp` passes, SSE emits `expired` and ends; WebSocket closes with **4401**.

### libSQL raw SQL gap

**Raw SQL from the Studio editor on libSQL is not captured.** Only writes that go through jord-server (HTTP, functions, triggers that call the API write path) insert into `jord_changes`. Studio Help documents the same gap.

## How

| Piece | Path |
|-------|------|
| Outbox | `cloud/jord/src/realtime/outbox.ts` |
| Watermark | `cloud/jord/src/realtime/watermark.ts` |
| Bus (fanout only) | `cloud/jord/src/realtime/bus.ts` |
| Migration | `elements/jord/migrations/{libsql,postgres}/0004_outbox.sql` |
| Studio | Live switch on records / tables; Help note for raw-SQL gap |

## Example

Open `GET /realtime?table=notes` with a bearer, then `POST /schema/tables/notes/rows`. The stream receives one `jord.change` with `"op":"insert"` and `"table":"notes"`. A PATCH that 409s produces no event. After prune, `GET /realtime?since=1` can return **410** with `hint: "resync"`.

## Not in Jord yet

SQLite update hooks · Turso external-writer capture · multi-node presence · Redis fanout · Postgres watermark race live test when `JORD_TEST_POSTGRES_URL` is unset
