---
title: "Tia — offline design"
feature_id: tia-F0008
description: "Staged offline: map display, continuing a downloaded route, and on-device routing feasibility — without overclaiming SDKs"
created: 2026-10-19
updated: 2026-10-19
tags:
  - feature
  - tia
  - offline
---

# Tia — offline design

> Index: [[README]]. Manifests: [[03-schemas]]. ADRs: [[12-adrs]].

## Three separate capabilities

| # | Capability | Depends on | Phase |
|---|------------|------------|-------|
| 1 | **Offline map display** | Regional vector tile pack + style + fonts/sprites | 5 |
| 2 | **Continue a previously downloaded route** | Cached geometry + maneuvers from last online route | 5 (easier) |
| 3 | **On-device route calculation / reroute** | On-device graph + costing engine | 5 **spike** — not assumed ready |

**Do not imply** MapLibre calculates routes. **Do not imply** server Valhalla automatically yields a mobile offline SDK.

## Mobile routing feasibility spike (**Proposed** Phase 5 gate)

Evaluate options explicitly:

| Option | Notes |
|--------|-------|
| Valhalla mobile / trimmed graphs | Feasibility and license/build cost **Unresolved** |
| GraphHopper / OSRM mobile | Alternative candidates |
| Online-only reroute with offline display | Acceptable interim product |

Exit criteria: measured pack size for pilot city, p95 route time on mid-tier phone, or documented “not feasible → defer.”

## Regional packs

- Bounded by bbox / region id.
- Storage budget shown before download (bytes).
- Version consistency: `tileSchemaVersion` + `styleVersion` (+ `graphVersion` if present) must match.
- Interrupted downloads: resumable object GETs; atomic activate on checksum OK.
- Stale indicator when server publishes newer pack for same region.

## Source permissions

Manifest `sourcePermissions` must record offline rights. OSM **data** ≠ OSMF **public tile** rights ([[02-data-sources]]).

## Device local storage

| Data | Store (**Proposed**) |
|------|----------------------|
| Pack files | App filesystem / object cache |
| Metadata, download queue, consent flags | SQLite / libSQL-compatible on device |
| Routing graphs / tile archives | **Not** assumed to live in libSQL |

## Links

- Backlog Phase 5: [[11-backlog-roadmap]] · Capacity downloads: [[10-capacity-ops]]
