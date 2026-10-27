---
title: "jord-F0009 — realtime"
feature_id: jord-F0009
description: "Shipped: SSE/WS, outbox CDC, since resume; LISTEN fan-out deferred to phase-03"
created: 2026-10-24
updated: 2026-10-27
tags:
  - feature
  - jord
  - done
  - realtime
---

# jord-F0009 — realtime

> CDC + live subscriptions. As-built: [[../../../tech_space/jord/realtime/README]]. Multi-instance LISTEN / presence → [[../INDEX|P1 · P6]].

## Phase-01

SSE (S0011) · WebSockets + multi-table fanout (S0018) — **Done**.

## CDC outbox (F5)

Opt-in `jord_tracked_tables`. Same-transaction outbox. Watermark: libSQL via write queue; Postgres withholds ahead-of-flight seqs. Retention 7d / 100k. `since` past retention → **410**. Delivery-time policy filter. Event name `jord.change`. `pg_notify` trigger exists; **`LISTEN` fan-out = jord-F0013**. Fan-out today is single-process.

**Done** 2026-10-25 (+ 02.75 atomic path / console `resync`). Plans: [[../../../plan/Jord/phase-02/Jord-S0023/README|S0023]] · [[../../../plan/Jord/phase-02.5/README|02.5 S0031]] · [[../../../plan/Jord/phase-02.75/README|02.75]].
