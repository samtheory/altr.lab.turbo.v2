---
title: "Phase 3 — WebSocket realtime route"
description: "Upgrade endpoint, auth, parity with SSE, shared subscriber cap"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0018
  - websocket
  - heimdall
---

# Phase 3 — WebSocket route

> Who: **sindri** · **heimdall**.

Sprint: [[README]] · Contract: [[01-contract]] · Bus: [[02-bus-emit]]

## Status

**done** (2026-10-24)

## Route

| Item | Choice |
|------|--------|
| Path | `GET /realtime/ws` (Hono WebSocket helper / `upgradeWebSocket` — use what `@hono/node-server` already supports in this repo) |
| Auth | Same middleware as SSE; reject before upgrade when possible |
| Messages | Server → client: JSON `JordChangeEvent` (and optional `{"type":"ping"}`) |
| Client → server | Ignore app messages in v1 (or accept `{"type":"pong"}` only) |

## SSE updates

- Allow `table` ≠ `records` per contract
- Shared cap with WS subscribers

## Tests

- WS connect + receive event after insert (records and one user table)
- 401 without auth; 403 records select-deny; 400 reserved table name

## Done when

- [ ] WS and SSE are interchangeable for the same filters
