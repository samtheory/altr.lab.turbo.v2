---
title: "Jord-S0018 — realtime WebSockets + multi-table fanout"
description: "Done: WS transport + user-table change emit; SSE stays"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0018
  - jord-studio
  - sprint
  - realtime
  - websocket
---

# Jord-S0018 — realtime WebSockets + multi-table fanout

> Who: **mimir**. **Status: done (2026-10-24).** Prior: [[../Jord-S0017/README]]. As-built: [[../../../tech_space/jord/17-s0018-realtime-ws]]. Next: [[../00-remaining-backlog]] (S0019). **Last numbered:** Jord-S0020.

**Sprint id:** `Jord-S0018`  
**Opened:** 2026-10-24 · **Closed:** 2026-10-24 · **Owner:** mimir  
**Hats:** **sindri** · **heimdall** · **apollo** · **docs_man**

## Design lock (v1) — shipped

| Piece | Choice |
|-------|--------|
| Source | Write-path emit (not native CDC) |
| Tables | `records` + user tables |
| SSE | Kept; widened `table=` |
| WebSocket | `/realtime/ws` via `@hono/node-ws` |
| Studio | Live on user-table grid (SSE BFF) |
| Cap | 48 shared |

## Phases

| # | Card | Hat | Status |
|---|------|-----|--------|
| 1 | [[01-contract]] | mimir / heimdall | **done** |
| 2 | [[02-bus-emit]] | sindri | **done** |
| 3 | [[03-server-ws]] | sindri / heimdall | **done** |
| 4 | [[04-studio-live]] | apollo | **done** |
| 5 | [[05-verify]] | mimir → docs_man | **done** |

## Definition of done

- [x] User-table writes publish `jord.change`
- [x] SSE accepts user-table `table=`
- [x] WebSocket receives same events
- [x] Auth / cap / no-body invariants
- [x] Studio Live on user-table grid
- [x] As-built [[../../../tech_space/jord/17-s0018-realtime-ws]]; next = S0019

## Explicitly out

- Native CDC hooks · Redis · blob/vector streams · S0019–S0020
