---
title: "Phase 1 — realtime WS + multi-table contract"
description: "Channels, payload, SSE+WS parity, auth, caps"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0018
  - contract
  - realtime
---

# Phase 1 — realtime contract

> Who: **mimir** · **heimdall**.

Sprint: [[README]] · Prior: [[../../../../tech_space/jord/realtime]]

## Status

**done** (2026-10-24)

## Lock

### Emit

| Rule | Choice |
|------|--------|
| When | After **successful** write-queue mutation |
| Never | Failed write, OCC **409**, policy **403** |
| Tables | `records` + user tables (same reserved rules as CREATE/DDL) |
| User-table `id` | Stringify primary-key value used in the mutate request |
| `version` | Only for `records` OCC rows |

### Subscribe

| Query | Meaning |
|-------|---------|
| `table` | Required. `records` or a valid user-table ident that exists (or allow subscribe before first write — prefer **valid ident + not reserved**; missing table → still allow listen for future creates, or **404** if must exist — **lock: valid ident, not reserved; no require-exists**) |
| `id` | Optional row filter |

### Transports

| Transport | Path | Notes |
|-----------|------|-------|
| SSE | `GET /realtime` | Keep; widen `table` |
| WebSocket | `GET /realtime/ws` | Same query params; JSON text frames matching SSE data payload; ping/pong or server ping every ~15s |

Both share one bus. Closing one transport does not affect the other.

### Auth / policy

| Role | Subscribe |
|------|-----------|
| admin / editor / readonly | yes (`canSubscribeRealtime`) |
| anonymous | 401 when auth on |

`records` select-deny policy → **403** on subscribe (both transports). User tables: no Jord policy gate in S0018.

### Caps

Keep `MAX_REALTIME_SUBSCRIBERS` (32) **or** bump to 48 documenting WS+SSE share the same counter. Over → **503** `realtime_full`.

## Done when

- [ ] Implementers can build bus + routes without debating native CDC
