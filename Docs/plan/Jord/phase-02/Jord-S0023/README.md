---
title: "Jord-S0023 — Outbox CDC + realtime upgrade"
description: "Tracked tables, commit watermark, notify-by-seq, 410 on expired since, single emit path"
created: 2026-10-24
updated: 2026-10-25
tags:
  - plan
  - jord
  - Jord-S0023
  - phase-02
  - realtime
  - cdc
---

# Jord-S0023 — Outbox CDC + realtime upgrade

> Who: **mimir**. **Status: in tree** (file libSQL, 2026-10-25). **Execution #8.** Next: [[../Jord-S0029/README]]. Postgres watermark race was not run (`JORD_TEST_POSTGRES_URL` unset).

**Sprint id:** `Jord-S0023`  
**Hats:** **sindri** · **saga** · **heimdall** · **docs_man**

## Goal

One transactional change log. Clients resume without skipping rows. The phase-01 in-process producer is **replaced** by the outbox fanout. The event name stays `jord.change`.

## In scope

- `jord_changes(seq, table_name, op, pk, old, new, actor, ts)` inserted **in the same transaction** as the data change
- **`jord_tracked_tables`** — capture is **opt-in per table**. Install triggers when a table is created or marked tracked, including tables the S0024 wizard creates on the target
- Do **not** use SQLite update hooks
- **Replace** the phase-01 in-process producer. One path only (outbox → fanout). Keep the client event name `jord.change` so Studio subscribers stay valid. Do not emit on both paths
- Postgres external writers: triggers insert `jord_changes` and `pg_notify`. **Payload is the seq only** (8 KB notify limit). The LISTEN loop reads the row by seq. Dedicated connection, reconnect, backoff
- **Resume watermark**
  - **libSQL:** the single write queue already orders commits. The API path cannot commit a higher seq first. The reader watermark is `max(seq)` after the queue finishes the transaction. There is no `xmin`
  - **Postgres:** commits can reorder. The reader returns only rows with `seq` at or below the watermark (no older seq still in flight). API writers also take an advisory transaction lock. External trigger writers rely on the watermark, not the lock
- Test that **reproduces the race**: higher seq commits first; a resume must not skip the lower seq (withheld until the watermark advances)
- Retention default: **7 days and 100_000 rows**, both configurable (`JORD_CHANGES_RETENTION_DAYS`, `JORD_CHANGES_RETENTION_ROWS`). Prune job deletes past either cap
- Indexes: `jord_changes(seq)` and `jord_changes(table_name, seq)`
- `?since=` older than the retained range → **410 Gone** with a resync hint (not an empty 200)
- Policy filter **at delivery**, using the subscriber's policies on the **new** row (and the **old** row for deletes)
- Large BLOB / bytea values are **omitted or replaced with a reference**, not inlined
- Document: **raw SQL from the Studio editor on libSQL is not captured**
- Optional: ephemeral broadcast/presence (in-memory, single-node, non-durable)

## Out of scope

Turso external-writer capture · dual emit · multi-node presence

## Schema

`jord_changes`, `jord_tracked_tables`. Prune via `jord_jobs`.

## Tests required

Same-tx outbox; watermark race on Postgres; 410 when `since` is pruned; notify payload is seq-only; policy filter on new vs old; BLOB omitted; file libSQL API-path test; no second emit path.

## Definition of Done

- [x] 410 + resync hint for expired `since`
- [x] In-process producer replaced; event name `jord.change` unchanged; no second path
- [x] Retention defaults (7 days and 100_000 rows) and both indexes exist
- [ ] libSQL test shows queue order; Postgres test shows the watermark race does not skip — queue-order + in-memory watermark unit tests passed; live Postgres race not run
- [x] libSQL raw-SQL gap documented in `tech_space/jord/realtime` and Studio
- [x] Category `realtime` updated
