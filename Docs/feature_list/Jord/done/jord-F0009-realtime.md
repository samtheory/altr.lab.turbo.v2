---
title: "jord-F0009 — realtime"
feature_id: jord-F0009
description: "Shipped: SSE/WS, outbox CDC, since resume; Postgres LISTEN fan-out + shared watermark (S0037)"
created: 2026-10-24
updated: 2026-10-29
tags:
  - feature
  - jord
  - done
  - realtime
---

# jord-F0009 — realtime

> CDC + live subscriptions. As-built: [[../../../tech_space/jord/realtime/README]]. Presence/broadcast → [[../todo/jord-F0018-storage-realtime-v2|jord-F0018]].

## Phase-01

SSE (S0011) · WebSockets + multi-table fanout (S0018) — **Done**.

## CDC outbox (F5)

Opt-in `jord_tracked_tables`. Same-transaction outbox. Watermark: libSQL via write queue; Postgres shared `jord_commit_watermark` (+ local in-flight hold). Retention 7d / 100k. `since` past retention → **410**. Delivery-time policy filter. Event name `jord.change`. `pg_notify` + **`LISTEN` fan-out** across instances ([[../../../plan/Jord/phase-03/S0037-listen-seq-fanout|S0037]] / [[jord-F0013-production-ops|jord-F0013]]). libSQL stays single-process bus.

**Done** 2026-10-25 (+ 02.75 atomic path / console `resync`; **S0037** LISTEN 2026-10-29). Plans: [[../../../plan/Jord/phase-02/Jord-S0023/README|S0023]] · [[../../../plan/Jord/phase-02.5/README|02.5 S0031]] · [[../../../plan/Jord/phase-02.75/README|02.75]] · [[../../../plan/Jord/phase-03/S0037-listen-seq-fanout|S0037]].
