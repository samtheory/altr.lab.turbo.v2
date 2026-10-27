---
title: "Tia — traffic and learning pipeline"
feature_id: tia-F0006
description: "Consented collection, matching, aggregation, Valhalla publication, evaluation, and anti-feedback safeguards"
created: 2026-10-19
updated: 2026-10-19
tags:
  - feature
  - tia
  - traffic
  - ml
---

# Tia — traffic and learning pipeline

> Index: [[README]]. Sources: [[02-data-sources]]. Schemas: [[03-schemas]].

## Consent-based collection

- Explicit opt-in; purpose limited to traffic/ETA improvement and product operation.
- Collection off ⇒ no probe upload (navigation may still use on-device GPS locally without upload).
- Withdrawal stops new uploads; retention/deletion per [[09-security]].

## Adaptive sampling and batching

| Mode | Sampling (**Proposed** defaults — tune with metrics) |
|------|------------------------------------------------------|
| Stopped | Rare heartbeats or none |
| Driving | Higher rate; batch every few seconds over HTTP |
| Background | OS-limited; larger batches, lower rate |

Batches include `clientDedupKey` per observation for idempotency.

## Durable delivery

| Concern | Approach (**Proposed**) |
|---------|-------------------------|
| Transport | Batched HTTPS first (Phase 2) |
| Idempotency | Unique `(subject/device, clientDedupKey)` |
| Ordering | Prefer `capturedAt`; tolerate late arrivals within window |
| Late data | Accept into historical profiles; may not affect live window |
| Ack | HTTP 2xx after durable write to Postgres (and optional object archive) |
| Independent of Pub/Sub | Live subscribers never own durability |

Jord jobs/DLQ: **not available** today — interim in-process retry with backoff; migrate when Jord jobs exist ([[01-architecture]]).

## Matching → directed-segment traversals

1. Map-match sequences → edge paths.
2. Estimate travel time per directed edge traversal.
3. Emit `TrafficObservation` with `sampleWeight` (lower for low confidence / short edges).

## Outliers and weighting

- Reject impossible speeds and U-turn noise.
- Prefer independent trips (`traceId`) over repeated samples from one stuck probe.
- Cap weight per subject per edge per window.

## Confidence and freshness

- `TrafficEdgeState.confidence` from sample count, variance, and age.
- `expiresAt` drives UI stale state.
- Below threshold ⇒ do not publish into live traffic version.

## Historical fallback

Bucketed `HistoricalSpeedProfile` by time-of-week. Used when live confidence low.

## Versioned publication into Valhalla

- Build `trafficVersion` artifact compatible with `graphVersion`.
- `TrafficPublisher.publish` (**Proposed**) updates Valhalla traffic tier or equivalent.
- Route responses echo both versions.
- Rollback = pin previous `trafficVersion`.

## External route ETAs

Neshan (and peers) expose **route-level** ETA, not verified raw segment speeds ([[02-data-sources]]). Do **not** assume they can train edge models. Optional labeled comparison only.

## Learning stages

| Stage | Method | When |
|-------|--------|------|
| Baseline | Statistical aggregation + historical profiles | Phase 3 |
| Later | Learned ETA corrections with held-out eval | After baseline metrics exist |

## Evaluation and safety

| Control | Purpose |
|---------|---------|
| Held-out trips | Measure ETA error without training leak |
| Drift detection | Alert when error worsens vs baseline |
| Rollback | Revert `trafficVersion` |
| Route oscillation guard | Hysteresis / penalty for flipping corridors |
| Self-congestion guard | Limit weight of fleets following Tia’s own suggested route |

## Links

- Capacity: [[10-capacity-ops]] · Backlog Phase 2–4: [[11-backlog-roadmap]]
