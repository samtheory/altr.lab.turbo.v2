---
title: "Tia — location quality"
feature_id: tia-F0005
description: "Providers, accuracy checks, map matching, degraded GNSS, mock signals, and honest UX under uncertainty"
created: 2026-10-19
updated: 2026-10-19
tags:
  - feature
  - tia
  - location
  - gps
---

# Tia — location quality

> Index: [[README]]. Schemas: [[03-schemas]]. All behaviors **Proposed** unless noted.

## Platform providers and fusion

| Platform | Typical providers | Tia approach |
|----------|-------------------|--------------|
| Web | Browser Geolocation API | Prefer high accuracy; treat as coarse vs native |
| Android | Fused Location Provider | Use fused when available; record `provider` |
| iOS | Core Location | Record horizontal accuracy + course |

Sensor fusion stays on-device. Server never invents a better GNSS fix than accuracy admits.

## Accuracy, freshness, heading, motion

| Check | Rule (**Proposed**) |
|-------|---------------------|
| Accuracy | Prefer fixes with `accuracyM` ≤ threshold by mode (e.g. driving 30–50 m soft) |
| Freshness | Discard or down-weight samples older than N seconds for live match |
| Heading | Require minimum speed before trusting course for match |
| Motion | Classify stopped vs moving; stopped samples do not invent edge speeds |
| Jump filter | Reject teleport jumps inconsistent with max plausible speed |

## Sequence-based map matching

- Match **sequences**, not isolated points.
- Maintain a particle/HMM-style belief over nearby edges (**Proposed** algorithm choice at spike).
- Output `LocationEstimate.mapMatched` with confidence; keep raw row immutable.

## Hard cases

| Case | Behavior |
|------|----------|
| Parallel roads | Keep multi-hypothesis until divergence; low confidence UI |
| Tunnels / multi-level | Increase uncertainty; do not snap aggressively to wrong level |
| Brief signal loss | Coast with decaying confidence; do not invent precise path |
| Long gap | End segment; start new match after reacquire |

## Mock location

- Record OS mock flags when exposed (`isMockSuspect`).
- Heuristics (impossible speeds, identical repeats) may raise suspicion.
- **Do not claim perfect detection.** Soft-quarantine for traffic learning; do not accuse users in UI without policy.

## Raw vs inferred

- `raw_observations` = what the device sent.
- `location_estimates` = what Tia inferred.
- Traffic learning uses estimates with quality gates; audits can join both.

## VPN and IP

- VPN changes network/IP path, **not** ordinarily GNSS coordinates.
- **Never** use IP geolocation as navigation ground truth or map-match input.

## Battery, background, compatibility

| Topic | Stance |
|-------|--------|
| Battery | Adaptive sampling when stationary; disclose battery impact in consent copy |
| Background | OS permission gated; degrade gracefully if denied |
| Compatibility | Document minimum OS/browser; unsupported devices get “location limited” |

## Degraded behavior under interference

Show uncertainty circle, “Position uncertain”, pause guidance suggestions that need high confidence, and prefer last known corridor over false precision. No promise of “GPS always recovers.”

## Links

- Traffic learning gates: [[05-traffic-pipeline]] · Security: [[09-security]]
