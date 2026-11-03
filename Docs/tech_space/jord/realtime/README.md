---
title: "Jord — realtime"
description: "Transactional outbox CDC over SSE and WebSocket; LISTEN fan-out across Postgres instances; resume with since; tracked tables only"
created: 2026-10-24
updated: 2026-10-29
tags:
  - tech-space
  - jord
  - realtime
  - cdc
  - s0037
---

# Jord — realtime

> Who: anyone subscribing to row changes. Writes that emit: [[../writes/README]]. Select policy: [[../policies/README]].

## Why

Studio grids should refresh after a successful mutation without polling. Phase-02 replaces the phase-01 in-process producer with a transactional outbox so clients can resume without skipping rows.

## What

**Single emit path.** Every server write to a **tracked** table goes through one helper, `writeChangeAs(principal)` in `cloud/jord/src/app.ts`. Inside the write queue it opens `jord.transaction`, runs the data write, inserts the `jord_changes` row(s) (`outbox.appendChange`, the only `INSERT INTO jord_changes` in the source; a test greps for this), and commits. Only after commit does it publish `jord.change`. If the outbox insert fails, the data write rolls back and the request fails (5xx). Callers: Studio rows, `/records`, `/api/v1/:table` (`RETURNING` for `new`; a PATCH reads the prior row in the same transaction for `old`), functions (`records_insert`), triggers, and `/x/:slug`. Event name stays `jord.change`. Payload: `type`, `table`, `op`, `id`, `version?`, `at`, `dialect`, plus `seq` for resume.

| Piece | Detail |
|-------|--------|
| Tables | `jord_changes(seq, table_name, op, pk, old_json, new_json, actor, ts)`, `jord_tracked_tables` |
| Indexes | `(seq)` and `(table_name, seq)` |
| Opt-in | Capture only for tracked tables. `records` is seeded tracked. `CREATE TABLE` marks the new table tracked. `PUT /schema/tables/:name/track` `{ tracked }` toggles |
| Retention | Default **7 days** and **100_000** rows (`JORD_CHANGES_RETENTION_DAYS`, `JORD_CHANGES_RETENTION_ROWS`). Job kind `changes_prune` |
| Resume | `GET /realtime?table=&since=` — catch up then live. `since` older than the retained range → **410** `{ error: "gone", hint: "resync" }` |
| Watermark | `appendChange` marks the seq in flight; `settle` after commit or rollback. **libSQL:** readers see `MAX(seq)`, held below the lowest seq still in flight in this process. **Postgres (S0037):** shared `jord_commit_watermark` advances contiguously across committed rows and `jord_changes_abandoned` gaps; readers take `min(shared, local in-flight hold)`. BIGSERIAL can commit out of order; a live test proves a higher seq is not readable for `since=` catchup until the lower one commits |
| Fan-out | In-process `RealtimeBus` per process. **Postgres (S0037):** one dedicated `LISTEN jord_changes` connection (`application_name=jord-realtime-listen`) reconnects with backoff; NOTIFY payload is `{ table, seq, txid }` (legacy plain seq still parsed) — rows are always re-read from the outbox. Local publishes are deduped so the writer does not double-deliver its own NOTIFY echo. **libSQL:** local bus only (no LISTEN) |
| Policy | Filter at delivery (catchup and live) using the subscriber's select policy and row scope on the **new** row (**old** for deletes) |
| BLOBs | Omitted from outbox JSON as `{ "$blob": true }` |
| Cap | **48** shared SSE+WS subscribers → **503** `realtime_full` |

| Transport | Path | Notes |
|-----------|------|-------|
| SSE | `GET /realtime?table=&id=&since=` | `text/event-stream`; ping every 15s |
| WebSocket | `GET /realtime/ws?table=&id=` | same JSON; `{type:"ping"}` every 15s |

Any authenticated principal may subscribe, including `user` and `anon`. When the access token `exp` passes, SSE emits `expired` and ends; WebSocket closes with **4401**.

**Every event is policy-checked, on both transports.** SSE (live and `since=` replay) and WebSocket share one gate, `canDeliverLive` → `liveDeliveryAllowed` in `cloud/jord/src/realtime/deliver.ts`. It loads the outbox row by `seq` and runs the table's select policy against it. The gate fails closed: no `seq`, a missing row (pruned between publish and lookup) or a lookup error means the event is not sent. WebSocket sends are chained per connection, so the async check cannot reorder events. Before phase-02.75 B10, WebSocket skipped this check.

### Table-level resync (raw SQL)

Raw SQL from the Studio SQL console is not captured row by row. After a successful **non-read-only** console write, `resyncTrackedAs(principal)` in `cloud/jord/src/app.ts` appends one row per tracked table with `op: "resync"`, `pk: ""` and NULL `old_json` / `new_json`, all in one transaction, still inside the write queue slot. After commit each row is published on its table channel as `{ type: "jord.change", table, op: "resync", id: "", at, dialect, seq }`. Clients refetch the table. It is not in the same transaction as the user's SQL (raw SQL may carry its own `BEGIN` / `COMMIT`), so a failed resync is logged and the write still succeeds. Read-only and failed queries emit nothing. Resync rows pass the `?id=` filter (live and on `since=` replay) because they carry no row id. Delivery still goes through the policy check.

### Not captured

- **Migrate wizard.** It only reads this database and writes the destination directly, so the destination's subscribers get no events for copied rows. Nothing changes here, so nothing is emitted here. A destination that resolves to the source database is refused with 400 (`targetIsSource` in `cloud/jord/src/migrate/wizard.ts`).

## How

| Piece | Path |
|-------|------|
| Write helper | `writeChangeAs` in `cloud/jord/src/app.ts` · type `WriteWithChange` in `cloud/jord/src/realtime/types.ts` |
| Outbox | `cloud/jord/src/realtime/outbox.ts` |
| Watermark | `cloud/jord/src/realtime/watermark.ts` (local in-flight) · shared table via outbox `settle` on Postgres |
| LISTEN bridge | `cloud/jord/src/realtime/listen.ts` — started when `realtimeListenUrl` is set (boot passes `DATABASE_URL`) |
| Bus (fanout only) | `cloud/jord/src/realtime/bus.ts` |
| Transaction | `JordDriverPort.transaction`: file libSQL `BEGIN IMMEDIATE` on the shared connection; hosted `libsql://` an interactive `client.transaction("write")`, with every adapter statement routed into it; Postgres one pooled client with the session GUCs. All three are atomic. Do not start detached jord work inside `work` |
| Migration | `elements/jord/migrations/{libsql,postgres}/0004_outbox.sql` · Postgres `0008_listen_watermark.sql` (shared watermark + abandoned gaps + JSON NOTIFY) |
| Tests | `cloud/jord/src/realtime/outbox.test.ts` (file + live Postgres) · `listen.test.ts` (parse always; two-instance + reconnect when `JORD_TEST_POSTGRES_URL` is set) · resync `cloud/jord/src/sql/resync.test.ts` · hosted atomicity `elements/jord/src/adapter/libsql-transaction.test.ts` (forced interactive path on `file:`; live run needs `JORD_TEST_LIBSQL_URL` + `JORD_TEST_LIBSQL_AUTH_TOKEN`) |

## Example

Open `GET /realtime?table=notes` with a bearer, then `POST /schema/tables/notes/rows`. The stream receives one `jord.change` with `"op":"insert"` and `"table":"notes"`. A PATCH that 409s produces no event. After prune, `GET /realtime?since=1` can return **410** with `hint: "resync"`.

## Presence + broadcast (S0083)

`GET /realtime/channel?channel=<table>` or `<table>:<rowId>` upgrades to a WebSocket. The join is policy-gated **before** the upgrade (403 `policy_denied`, identical for a missing row): a row channel needs the row to exist and `select` to allow it; a table channel needs `select` with no row scope. Messages: `join`/`track {state}`, `leave`, `broadcast {event,payload}`, `heartbeat`, `sync` from the client; `joined`, `presence` (`sync`/`join`/`update`/`leave`), `broadcast`, `error`, `ping` from the server. Policy and session are re-checked every 30 s (close 4401 revoked/expired, 4403 access revoked, 4408 heartbeat, 1008 rate limit, 1013 full or backpressure, 1009 oversize frame). Caps: 256 channels, 64 members per channel, 8 sockets per principal (`JORD_PRESENCE_MAX_PER_PRINCIPAL`), 1 KB state, 4 KB payload, 10 msg/s. Presence is in memory; instances exchange it over Postgres `NOTIFY jord_presence` (45 s expiry, owner-only updates). State and payload are client-asserted; the server stamps only `kind` and never exposes user ids. The open SSE and WS change feeds now also re-check the session (SSE `expired: session_revoked`, WS 4401). Open: two-instance behaviour is proven in memory only (Postgres test needs `JORD_TEST_POSTGRES_URL`); the ws `maxPayload` of 64 KiB is global; sid-less tokens are never re-checked.

## App endpoint (S0084)

`/p/:project/realtime` (WebSocket, SSE fallback on the same path) lets a browser app subscribe to **one table** with only a project **publishable** key (`x-jord-key` / `apikey`, or `?apikey=` on the WebSocket upgrade) and an optional end-user JWT (none = `anon`). Privileged credentials (secret and barrier keys, server token, operator tokens, non-user JWT roles) are refused with `401 secret_key_not_allowed` before any lookup; a bad key is the same `401 invalid_key` for every slug; `403 wrong_project` and `410 project_unavailable` need a valid key. Frames: `ready`, `subscribe {table, filter?, since?, limit?}`, `snapshot {rows, pk, cursor, truncated}`, `jord.change`, `resync`, `error`; policy is evaluated per row at delivery (a row that leaves the filter or policy becomes `op:"delete"` with `row:null`); cursor too old = `409 resync_required`. One pending-or-active subscription per connection, 4 predicates, 500-row snapshot (2 MiB cap), caps per IP / key / principal, 64 KiB frames, 1 MiB backpressure close. Query strings are redacted from traces. Open: all projects share one data plane (a warning is logged), no per-project origin allowlist, `seq` gaps are visible, revocation reaches open sockets within 30 s.

## Realtime client (S0085)

`createRealtime({url, project, key, ...})` in `@altr/jord-client` (dependency-free) wraps the app endpoint: `subscribe({table, filter?, since?, limit?, onChange, onState?, onSnapshot?, onError?})` returns `{unsubscribe(), state, partial, dropped}`. States `connecting -> live -> degraded -> resync -> live`, terminal `closed` (`reason`, `code`). Reconnect uses full-jitter exponential backoff (500 ms base, 30 s cap, counter reset only after 10 s of stable live time or the first delta), heartbeat timeout 45 s, resume with the last cursor as `since`, duplicates dropped by `seq` (gaps are normal, `seq` is global), and a server `resync` / 409 `resync_required` discards the cursor and delivers a fresh snapshot before any delta (5 consecutive resyncs end in `resync_loop`). 4401 refreshes the token once per stable period (terminal without `refreshToken`), 4403 / 4410 are terminal, 4429 waits at least 5 s. Frames are validated (table, integer `seq`, array rows); keys and tokens are redacted from every error. Contract: header comment of `elements/jord-client/src/realtime/client.ts`. Open: tested against a fake WebSocket only; no SSE transport; a browser connection cannot send a JWT and stays `anon`.

## Not in Jord yet

SQLite update hooks · Turso external-writer capture · Redis fanout; presence/broadcast (incl. multi-node via NOTIFY) shipped in S0083 (above)
