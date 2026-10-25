---
title: "Jord — realtime"
description: "Write-path change events over SSE and WebSocket for records and user tables"
created: 2026-10-24
updated: 2026-10-25
tags:
  - tech-space
  - jord
  - realtime
---

# Jord — realtime

> Who: anyone subscribing to row changes. Writes that emit: [[../writes/README]]. Select policy on `records`: [[../policies/README]].

## Why

Studio grids should refresh after a successful mutation without polling and without claiming to be a database CDC hook. The event is published by the same process that committed the write.

## What

Emit **after** a successful `records` or user-table mutation (HTTP, function `records_insert`, trigger-invoked functions). Failed writes and HTTP **409** do not emit. Payload `jord.change`: `type`, `table`, `op`, `id`, `version?`, `at`, `dialect`. No row body and no connection string.

| Transport | Path | Notes |
|-----------|------|-------|
| SSE | `GET /realtime?table=&id=` | `text/event-stream`; ping every 15s |
| WebSocket | `GET /realtime/ws?table=&id=` | same JSON; `{type:"ping"}` every 15s |

`table` is `records` or a user-table ident (not reserved). Any authenticated principal may subscribe, including `user` and `anon`. When the access token `exp` passes, SSE emits `expired` and ends; WebSocket closes with **4401**. A **select deny** policy rejects a `records` stream with **403**. Cap is **48** shared SSE+WS subscribers → **503** `realtime_full`. The bus is in-process. Listener errors do not fail the write.

## How

| Piece | Path |
|-------|------|
| Bus | `cloud/jord/src/realtime/bus.ts` |
| Event shape | `cloud/jord/src/realtime/types.ts` |
| WS inject | `@hono/node-ws` in `cloud/jord/src/index.ts` |
| Studio | Live switch on the records browser and on `/tables/[name]` via SSE BFF `/api/realtime` |

## Example

Open `GET /realtime?table=notes` with a bearer, then `POST /schema/tables/notes/rows`. The stream receives one `jord.change` with `"op":"insert"` and `"table":"notes"`. A PATCH that 409s produces no event.

## Not in Jord yet

SQLite update hooks, Postgres `LISTEN/NOTIFY`, Redis fanout, blob or embedding CDC.
