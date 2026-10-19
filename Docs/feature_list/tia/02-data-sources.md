---
title: "Tia — data-source inventory"
description: "Coverage, access class, freshness, permissions, and fallbacks for Tia map and traffic inputs"
created: 2026-10-19
updated: 2026-10-19
tags:
  - feature
  - tia
  - data-sources
  - licensing
---

# Tia — data-source inventory

> Index: [[README]]. Verification date for external rows: **2026-10-19** unless noted.

## Access classes

| Class | Meaning |
|-------|---------|
| Public | Freely obtainable under a published license (still respect attribution / tile policy) |
| Paid | Published commercial API or data product |
| Partner-only | Requires contract; not self-serve |
| Unverified | Existence, terms, or Iran coverage not confirmed |

## Inventory

### 1. OpenStreetMap (road geometry / attributes)

| Field | Detail |
|-------|--------|
| Coverage | Global; Iran coverage quality varies by city — treat pilot QA as required |
| Fields | Ways, nodes, tags (highway, oneway, maxspeed, name:fa, …) |
| Access | **Public** data (ODbL). Tile **servers** are separate |
| Kind | Geometry + static attributes — **not** live traffic counts |
| Freshness | Extract age you choose; planet/region diffs |
| Outages | Your tile/graph pipeline; not OSM.org edit API |
| Retention / attribution | ODbL share-alike for derivative databases; visible attribution required |
| Offline / redistribute | **Data:** yes under ODbL. **Official raster/vector tiles from `tile.openstreetmap.org`:** bulk download and offline packs **prohibited** — [OSMF Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/) (**Verified external** 2026-10-19) |
| Integration | Self-host tiles/graph from extracts (tippecanoe / Planetiler / Valhalla tiles, etc.) — **Proposed** |
| Fallback | Older extract with UI “map data date” |

### 2. Self-hosted / licensed vector tiles (Tia-generated)

| Field | Detail |
|-------|--------|
| Coverage | Pilot bbox first |
| Access | **Proposed** first-party |
| Kind | Display geometry for MapLibre |
| Freshness | Build pipeline version |
| Permissions | You control packaging for offline if source licenses allow |
| Fallback | Last good tile pack; show stale banner |

### 3. Neshan Platform APIs

| Field | Detail |
|-------|--------|
| Docs | Routing with live traffic: [Direction API](https://platform.neshan.org/docs/api/routing-category/routing/) — `GET https://api.neshan.org/v4/direction` |
| Pricing | [Pricing](https://platform.neshan.org/Pricing/) pay-as-you-go; FAQ states **200,000 تومان/month free credit for up to three months** after account creation ([FAQ](https://platform.neshan.org/FAQ/)) (**Verified external** 2026-10-19) |
| Fields exposed | Route geometry, distance, duration (traffic-aware ETA). **Do not assume** raw segment speeds, offline reuse, caching rights, redistribution, or model-training rights without reading current Terms |
| Access | **Paid** (dev credit time-limited) |
| Kind | **Route-ETA** / path — not verified as raw speed feed |
| Freshness | Provider-controlled |
| Outages | Provider SLA unverified |
| Integration | Optional `RoutingProvider` for A/B — **Proposed**; never sole graph |
| Fallback | Tia Valhalla without partner |

**Unresolved:** exact Terms clauses for caching, offline, training — legal review before any production blend.

### 4. First-party consented driver observations

| Field | Detail |
|-------|--------|
| Coverage | Wherever consented clients run |
| Fields | See [[03-schemas]] raw observations |
| Access | First-party under consent |
| Kind | Probe samples → derived speeds / traversals |
| Freshness | Seconds–minutes after processing |
| Retention | Minimized; policy in [[09-security]] |
| Offline | Queue on device; upload later |
| Fallback | Historical profiles / free-flow |

### 5. Iranian government / municipal traffic organizations

| Field | Detail |
|-------|--------|
| Examples | National/municipal traffic control centers, camera/sensor programs |
| Access | **Unverified** / likely **Partner-only** |
| Kind | May be counts, incidents, or CCTV — unknown |
| Status | **Partnership/discovery** — not an existing Tia API |
| Fallback | First-party + historical |

### 6. Public transport operators (GTFS / GTFS-Realtime)

| Field | Detail |
|-------|--------|
| Coverage | Iran cities — **Unverified** per operator |
| Access | **Unverified** |
| Kind | Stops, trips, realtime vehicle positions if RT exists |
| Status | Phase 6 discovery |
| Fallback | Omit transit UI |

### 7. Commercial map competitors (Balad, etc.)

| Field | Detail |
|-------|--------|
| Access | Generally closed apps; no assumed public traffic API |
| Status | Competitive reference only — **not** an integration source unless a published API appears |

### 8. Historical speed profiles (Tia-built)

| Field | Detail |
|-------|--------|
| Coverage | Edges with enough samples |
| Access | First-party derived |
| Kind | Speed by time-of-week buckets |
| Freshness | Rebuild schedule **Proposed** |
| Fallback | Free-flow / tagged maxspeed |

## Blending rules (**Proposed**)

1. Prefer first-party aggregated speeds with confidence ≥ threshold.
2. Else historical profile for that time bucket.
3. Else free-flow / static.
4. Partner route-ETA may be shown **labeled** beside Tia ETA — never silently overwrite Tia edge speeds unless license allows and ADR revisited.

## Links

- Traffic pipeline: [[05-traffic-pipeline]] · Security: [[09-security]] · ADRs: [[12-adrs]]
