---
title: "Tia — realtime and infrastructure"
description: "Ingest, subscriptions, durable vs transient paths, object storage, rate limits, and version compatibility"
created: 2026-10-19
updated: 2026-10-19
tags:
  - feature
  - tia
  - realtime
  - infrastructure
---

# Tia — realtime and infrastructure

> Index: [[README]]. Architecture: [[01-architecture]]. Jord realtime is **Deferred** — not implemented.

## Ingest

| Stage | Transport | Status |
|-------|-----------|--------|
| Initial | Batched HTTPS POST of observation batches | **Proposed** Phase 2 |
| Later | Optional streaming upload | **Deferred** |

Idempotent durable write before any fan-out.

## Subscriptions (traffic / incidents)

| Mechanism | Use | Status |
|-----------|-----|--------|
| SSE or WebSocket | Push traffic tile diffs / incident updates for viewport | **Proposed** on `cloud/tia` interim |
| Jord WS/CDC | Prefer when Jord realtime exists | **Deferred** dependency |

Geographic subscriptions: client sends bbox; server caps fan-out (max connections, max area, max Hz).

## Reconnect

- Snapshot of current `trafficVersion` + relevant edge states (or tile epoch).
- Monotonic `sequence` / event id for gap detection.
- Resync = snapshot + replay from sequence when available; else full snapshot.

## Durable queue vs transient notifications

| Path | Role |
|------|------|
| Postgres (+ object archive) | Source of truth for observations |
| Redis-compatible | Ephemeral presence, rate counters, hot edge state — optional |
| Pub/Sub / WS | Best-effort notifications; never sole store |

## Object storage

| Artifact | Lifecycle (**Proposed**) |
|----------|--------------------------|
| Raw trace archives | Hot → cold → delete per retention |
| Tile packs | Versioned; keep N previous |
| Graph artifacts | Immutable per `graphVersion` |

## Database partitioning

Partition `raw_observations` (and heavy traffic tables) by time. Drop old partitions per policy.

## Rate limits and cache keys

| Key pattern | Purpose |
|-------------|---------|
| `route:{hash(origin,dest,graph,traffic,costing)}` | Short TTL route cache |
| `tiles:{schema}:{z}:{x}:{y}` | CDN/cache |
| `traffic:edge:{graph}:{traffic}:{edgeId}` | Hot state |

Reject mismatched `graphVersion`/`trafficVersion` pairs.

## Links

- Security rate limits / spam: [[09-security]] · Capacity: [[10-capacity-ops]]
