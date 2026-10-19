---
title: "Tia — realtime map engine"
description: "Idea track for Tia; promoted intent lives in feature_list/tia"
created: 2026-10-19
updated: 2026-10-19
tags:
  - idea
  - tia
  - map-engine
  - navigation
  - traffic
  - realtime
  - readme
---

# Tia

> Open this for naming and R&D context. **Build intent:** [[../../feature_list/tia/README]]. Sharpen: [[2026-10-19-sharpen]]. Catalog: [[../2026-10-18-product-catalog]]. Map: [[../../brain/00-Docs-Brain]].

**Product:** **Tia**

**Folder:** `idea/Tia (Map Engine)/` — same pattern as [[../Apolyx (ui-kit)/README|Apolyx (ui-kit)]].

**Vault stage:** **promoted** (2026-10-19). Intent under `feature_list/tia/`. No `plan/tia/` yet. **No Tia code** in the monorepo.

## Vision (short)

Iran-focused reusable mapping, navigation, and live-traffic platform: OSM + MapLibre + Valhalla spine, consented driver observations, staged offline, optional authorized partner/government feeds after verification. Multi-app reuse via shared contracts/SDKs.

## Where to read

| Need | Doc |
|------|-----|
| Product definition | [[../../feature_list/tia/00-intent]] |
| Architecture + Jord honesty | [[../../feature_list/tia/01-architecture]] |
| Data sources (Neshan/OSM verified 2026-10-19) | [[../../feature_list/tia/02-data-sources]] |
| Backlog phases 0–6 | [[../../feature_list/tia/11-backlog-roadmap]] |
| ADRs | [[../../feature_list/tia/12-adrs]] |
| Blockers / user choices | [[../../feature_list/tia/13-risks]] |

## Stack synergy (intent)

Apolyx for chrome. MapLibre for the map. Jord for dialect/jobs/streaming **when those capabilities exist** — today Jord is planned libSQL Slice 0 only; Tia’s spatial DB is Postgres+PostGIS (**Proposed**). See [[../../feature_list/tia/01-architecture]].
