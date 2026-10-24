---
title: "Jord-S0011 — Studio S9 realtime as-built"
description: "Write-path change events, SSE on jord-server, Studio Live toggle via BFF"
created: 2026-10-24
updated: 2026-10-24
tags:
  - tech-space
  - jord
  - Jord-S0011
  - jord-studio
  - realtime
  - sse
---

# Jord-S0011 — Studio S9 realtime as-built

> Who: mimir / operators after S9. Plan: [[../../plan/Jord/Jord-S0011/README]] · Prior: [[09-s0010-postgres]] · Intent: [[../../feature_list/Jord/03-jord-studio]].

## Contract

| Piece | Decision |
|-------|----------|
| Source | Emit **after** a successful `records` write (HTTP insert/update/delete, function `records_insert`, trigger-invoked functions). Failed writes and HTTP **409** do not emit |
| Transport | SSE `GET /realtime?table=records` (`text/event-stream`). Optional `id=` filter |
| Event | `jord.change` JSON: `type`, `table`, `op`, `id`, `version?`, `at`, `dialect`. No row body, no connection string |
| Auth | Same bearer as other routes. `admin` / `editor` / `readonly` may subscribe. Mutate stays on existing write gates |
| Policies | A matching **select deny** rejects the stream with **403** (`policy_denied`) |
| Cap | 32 in-process subscribers → **503** `realtime_full` |
| Fanout | `RealtimeBus` in the jord-server process. No Redis, no SQLite hooks, no `LISTEN/NOTIFY`, no WebSockets |
| Studio | Records toolbar **Live** switch (`@altr/apolyx` Switch + Badge). `EventSource` hits `/api/realtime`, which attaches the session bearer |
| Browser | Never opens `data/jord.db` |

## Server (`@altr/jord-server`)

| Piece | Role |
|-------|------|
| `src/realtime/types.ts` | Event contract |
| `src/realtime/bus.ts` | In-process pub/sub; listener errors do not fail the write |
| `src/app.ts` | Publish after successful records mutations; `GET /realtime` via `streamSSE` |
| `src/auth/roles.ts` | `canSubscribeRealtime` |

Heartbeat comments are SSE `ping` events every 15s.

## Studio (`apps/jord-studio`)

| Piece | Role |
|-------|------|
| `src/app/api/realtime/route.ts` | Cookie session → bearer proxy of the SSE body |
| `src/components/records-browser.tsx` | Live toggle; on `jord.change`, refetch the current bucket |

## Verify

```bash
pnpm --filter @altr/jord-server test
pnpm --filter @altr/jord-server typecheck
pnpm --filter @altr/jord-studio typecheck
```

2026-10-24: jord-server **25** tests passed (including SSE insert event, no event on 409, select-deny 403). Typecheck clean for server and Studio.

Postgres uses the same publish path (`dialect` field). A live Postgres SSE round-trip was not run; default suite stays on `file:`.

## Out of this slice

WebSockets, native CDC hooks, blobs (S10), vectors (S11), hosted `libsql://`.
