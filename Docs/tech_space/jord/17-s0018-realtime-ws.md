---
title: "Jord-S0018 — realtime WebSockets + multi-table fanout"
description: "Write-path emit for user tables; SSE widened; WS /realtime/ws; Studio Live on grids"
created: 2026-10-24
updated: 2026-10-24
tags:
  - tech-space
  - jord
  - Jord-S0018
  - jord-studio
  - realtime
  - websocket
---

# Jord-S0018 — realtime WS + multi-table as-built

> Who: mimir / operators after S0018. Plan: [[../../plan/Jord/Jord-S0018/README]] · Prior: [[10-s0011-realtime]]

## Contract

| Piece | Decision |
|-------|----------|
| Source | Still write-path emit after successful mutations (not SQLite hooks / `LISTEN`) |
| Tables | `records` + user tables (valid ident, not reserved) |
| SSE | `GET /realtime?table=&id=` — table no longer limited to `records` |
| WebSocket | `GET /realtime/ws?table=&id=` via `@hono/node-ws`; JSON frames = same `jord.change` payload; `{type:ping}` every 15s |
| Cap | 48 shared SSE+WS subscribers → 503 `realtime_full` |
| Auth | Bearer; `canSubscribeRealtime`. Select-deny policy gates **`records` only** |
| Payload | No row body / secrets |
| Studio | User-table **Live** via SSE BFF; WS verified in server tests |

## Server

| Piece | Role |
|-------|------|
| `realtime/types.ts` | `table: string`; `isRealtimeSubscribeTable` |
| `realtime/bus.ts` | `trySubscribeFiltered` |
| `app.ts` | Publish on user-table row CRUD; SSE+WS routes; `injectWebSocket` on returned app |
| `index.ts` | `app.injectWebSocket(server)` after `serve` |

## Studio

| Piece | Role |
|-------|------|
| `/api/realtime` | Validates table; proxies SSE with session bearer |
| `table-browser.tsx` | Live Switch + Badge (same pattern as records) |

## Verify (2026-10-24)

- `pnpm --filter @altr/jord-server test` — bus filter, multi-table SSE, WS insert event
- `pnpm --filter @altr/jord-server typecheck`
- `pnpm --filter @altr/jord-studio typecheck`

## Out of this ship

Native CDC hooks, Redis fanout, blob/vector streams, Studio WS client, hosted `libsql://` (S0019), hard pgvector (S0020 — last numbered).
