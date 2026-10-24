---
title: "Jord-S0023 — Outbox CDC + realtime upgrade"
description: "Transactional jord_changes; PG LISTEN; resume by seq; policy-filtered fanout"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0023
  - phase-02
  - realtime
  - cdc
---

# Jord-S0023 — Outbox CDC + realtime upgrade

> Who: **mimir**. **Status: planned** (blocked on S0021; prefers S0022 for table-write coverage). Feature F5. Prior: [[../Jord-S0022/README]]. Next: [[../Jord-S0024/README]].

**Sprint id:** `Jord-S0023`  
**Hats:** **sindri** · **saga** · **heimdall** · **apollo** · **docs_man**

## Goal

Durable change log written in the same transaction as data; realtime resumes with `?since=seq`; Postgres also captures external writers.

## In scope

- `jord_changes(seq, table_name, op, pk, old, new, actor, ts)` — transactional outbox (not SQLite update hooks)
- Postgres: triggers → `jord_changes` + `pg_notify`; dedicated LISTEN connection with reconnect/backoff
- libSQL: API-path writes only — document the limit in UI + docs
- Fanout reads `jord_changes`; `?since=<seq>`; retention prune job
- Realtime respects S0021 policies (filter per principal)
- Optional second half: ephemeral broadcast/presence (in-memory, single-node, non-durable) — mark clearly

## Out of scope

Claiming Turso/libSQL captures external writers · multi-node presence · Redis

## File-level change list (expected)

| Area | Paths |
|------|-------|
| Server | write path outbox insert; realtime resume; LISTEN supervisor; prune job |
| Engine | dialect-specific trigger DDL helpers if needed |
| Studio | document libSQL capture limit; optional channel UI if presence ships |
| Docs | `tech_space/jord/realtime` (+ `jobs`, `writes`) |

## Schema

`jord_changes` as above. Retention via job (reuse `jord_jobs`).

## HTTP / realtime

Existing `/realtime` + `/realtime/ws` gain `since` resume semantics; payload remains policy-filtered.

## Tests required

Same-tx outbox with insert/update/delete; resume from seq; policy filter; PG LISTEN path when URL set; document libSQL limit assertion in docs/tests comments.

## Definition of Done

- [ ] No reliance on unsupported SQLite update hooks
- [ ] PG external writer captured in test
- [ ] Retention job exists
- [ ] Category `realtime` updated
