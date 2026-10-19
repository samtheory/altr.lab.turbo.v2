---
title: "Tia — capacity and operations"
description: "Scenario estimates for pilot and growth; failures, observability, graph rollout — labeled assumptions, no fake benchmarks"
created: 2026-10-19
updated: 2026-10-19
tags:
  - feature
  - tia
  - capacity
  - operations
---

# Tia — capacity and operations

> Index: [[README]]. Figures below are **planning estimates** with explicit assumptions. They are **not** measured benchmarks.

## Scenarios

| Scenario | Active consented drivers | Notes |
|----------|--------------------------|-------|
| Pilot | 50 | Single city, internal testers |
| Early | 1_000 | Soft launch |
| Growth | 20_000 | Still regional — not national claim |

## Sampling assumptions (**Proposed**)

| Parameter | Pilot | Early | Growth |
|-----------|-------|-------|--------|
| Moving sample interval | 5 s | 5 s | 5 s |
| Moving fraction of day | 1.5 h | 1.5 h | 1.5 h |
| Samples / driver / day | ≈ 1_080 | ≈ 1_080 | ≈ 1_080 |
| Peak concurrent moving | 10 | 150 | 2_000 |

### Samples per second (order of magnitude)

| Scenario | Peak samples/s (approx.) |
|----------|---------------------------|
| Pilot | 10 / 5 ≈ **2** |
| Early | 150 / 5 ≈ **30** |
| Growth | 2_000 / 5 ≈ **400** |

Batching (e.g. 5 samples/request) cuts HTTP RPS by ~5×.

## Payload and storage (raw)

Assumption: ~200 bytes average JSON observation after decode (estimate only).

| Scenario | Samples / day | Raw bytes / day (approx.) |
|----------|---------------|---------------------------|
| Pilot | 50 × 1_080 ≈ 54k | ~10 MB |
| Early | ~1.1M | ~210 MB |
| Growth | ~22M | ~4 GB |

Indexes, WAL, replicas: budget **2–5×** raw for Postgres operational size (**assumption**). Replication: single primary fine for pilot; read replica **Deferred**.

## Routing and map-matching compute

| Load | Assumption |
|------|------------|
| Interactive routes | Pilot: tens RPM; growth: design for hundreds RPM before shard |
| Map matching | CPU-bound; scale workers before claiming growth SLOs |

No invented p99 latencies — measure in Phase 1–2 spikes.

## Tile egress and offline

| Item | Assumption |
|------|------------|
| Interactive tiles | Cacheable; CDN later |
| Offline pack size | **Unresolved** until city extract built — show measured size in spike |
| Concurrent pack downloads | Rate-limit; resume support |

## Realtime fan-out

Assumption: each subscriber gets ≤ 1 Hz bbox updates; cap subscriptions per IP/app.

| Scenario | Concurrent subscribers (guess) | Events/s order |
|----------|--------------------------------|----------------|
| Pilot | 20 | low tens |
| Growth | 5_000 | need aggregation / region sharding |

## Failures and recovery (**Proposed**)

| Failure | Response |
|---------|----------|
| Valhalla down | Return 503 for routes; map tiles may still work |
| Postgres down | Fail ingest durably (client retry); do not invent success |
| Redis down | Fall back to Postgres-only hot path |
| Bad traffic publish | Rollback `trafficVersion` |
| Bad graph | Pin previous `graphVersion`; block mismatched traffic |

## Observability

Metrics: ingest accept/reject, match confidence histogram, route latency, ETA error vs held-out, traffic age, pack download success. Structured logs with `graphVersion` / `trafficVersion`. Tracing optional later.

## Graph / traffic rollout

1. Build artifact → shadow validate → percentage publish → full → monitor → rollback switch.

## Links

- Pipeline: [[05-traffic-pipeline]] · Risks: [[13-risks]]
