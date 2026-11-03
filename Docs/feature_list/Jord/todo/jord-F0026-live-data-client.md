---
title: "jord-F0026 — live data for client apps"
feature_id: jord-F0026
description: "Project-scoped realtime: publishable-key subscribe, snapshot + deltas, resume after reconnect, Studio live toggle"
created: 2026-10-28
updated: 2026-10-28
tags:
  - feature
  - jord
  - todo
  - jord-F0026
  - realtime
  - studio
---

# jord-F0026 — live data for client apps

> **Status:** todo · **Id:** `jord-F0026` · Index: [[../INDEX]] · Built on [[../done/jord-F0009-realtime|jord-F0009]] · v2 presence/broadcast stays in [[jord-F0018-storage-realtime-v2|jord-F0018]]

## What

Today realtime exists and the Studio has a live view. What is missing is the **app-facing contract**: an app pointed at a project receives initial data and then every change, with auth and policy applied, and recovers cleanly from a dropped connection.

| Piece | Detail |
|-------|--------|
| Endpoint | `wss://<server>/p/<project>/realtime` (+ SSE fallback), one subscription per table with optional filter |
| Auth | Publishable key header + optional end-user JWT; the **secret key is server-only** and never shipped to a client app |
| Delivery | Initial snapshot with a `since` cursor, then `jord.change` deltas; policies applied at delivery time (unchanged rule) |
| Reconnect | Exponential backoff, heartbeat/ping, resume from last cursor; cursor past retention → documented resync (no silent gap) |
| Ordering | Per-table monotonic sequence; duplicate events dropped client-side |
| Latency | Local change → subscribed app < 500 ms target |
| Studio | "Live" toggle on the tables grid, subscriber count + event log on [[jord-F0022-project-dashboard|the dashboard]], per-project channel names in the API drawer |
| Client snippet | Generated per project: env block, connection init, subscribe example for `@altr/jord-client` |
| Failure | Unauthorized → 401, wrong project key → 403, paused/archived project → 410 with reason |

Depends on multi-instance `LISTEN` fan-out ([[jord-F0013-production-ops|jord-F0013]]) for more than one server process; single-process is the shipping baseline.

## Acceptance

1. Two clients subscribe to one table; a write in one appears in the other, and in a plain client app, within 500 ms.
2. Pull the network for 30 s, perform writes, reconnect: no duplicate rows and no missed rows in a deterministic test.
3. A subscriber without a read policy receives no rows and a clear 403, including through the snapshot path.
4. Snapshot + deltas can be replayed from `since` and produce the same final state as a fresh snapshot.

## Overlap

| Id | Change |
|----|--------|
| [[../done/jord-F0009-realtime\|jord-F0009]] | Transport, outbox, retention, watermark already shipped — extend, do not rebuild |
| [[jord-F0018-storage-realtime-v2\|jord-F0018]] | Presence/broadcast remain there; this note is data sync for apps |
| [[jord-F0021-projects-provisioning\|jord-F0021]] | Provides per-project keys and channel namespace |
| [[jord-F0025-tables-workspace-v2\|jord-F0025]] | Consumes the same stream for the live grid |

## Out of scope

Offline-first local replica / conflict resolution · client-side query subscriptions beyond one table · presence.

## Plan tasks

| Task | Est. | Status |
|------|------|--------|
| [[../../../plan/Jord/phase-03/done/S0084-realtime-app-endpoint\|S0084]] — app realtime endpoint | 3 h | **done** 2026-11-03 |
| [[../../../plan/Jord/phase-03/done/S0085-realtime-reconnect\|S0085]] — reconnect + resume | 2–3 h | **done** 2026-11-03 |
| [[../../../plan/Jord/phase-03/done/S0086-live-toggle-snippet\|S0086]] — Studio live toggle + snippet | 2–3 h | **done** 2026-11-03 |

Queue: [[../../../plan/Jord/phase-03/README]].
