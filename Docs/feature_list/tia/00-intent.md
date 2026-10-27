---
title: "Tia — product definition"
feature_id: tia-F0001
description: "Users, scope, non-goals, pilot assumptions, multi-app reuse, and uncertainty visibility for Tia"
created: 2026-10-19
updated: 2026-10-19
tags:
  - feature
  - tia
  - intent
  - product
---

# Tia — product definition

> Who: product owners and implementers deciding what Tia is. Index: [[README]]. Idea: [[../../idea/Tia (Map Engine)/README]].

**Status of this note:** **Proposed** product intent promoted from idea. No Tia code exists (**Verified repo** 2026-10-19).

## Vision

Tia is an **Iran-focused**, reusable **mapping, navigation, and live-traffic** platform for altr.lab apps. It provides independently usable routing, can incorporate **authorized** government and commercial data when available, collects **consented** driver observations, improves traffic estimates and ETA through measured feedback, handles noisy/stale/uncertain locations, supports **staged** offline capabilities, and may eventually support public transportation where usable data exists.

Tia is not a thin wrapper over a single vendor SDK. First-party OSM-derived graph + MapLibre styling + Valhalla (behind a provider interface) is the initial technical spine (**Proposed**; see [[12-adrs]]).

## Users and use cases

| User | Primary jobs |
|------|----------------|
| Pilot driver / operator (you first) | See a styled Iran map, search places, get a base route, follow navigation UI, optionally share consented location samples |
| App developer inside altr.lab | Embed map, route, ETA, and traffic overlays through **shared contracts and SDKs** without forking geographic logic |
| Future partner / white-label | Host or call Tia APIs under license — **Deferred** |

### Use cases (pilot → growth)

| ID | Outcome | Phase |
|----|---------|-------|
| U1 | Pan/zoom a styled map of the pilot region with attribution | 1 |
| U2 | Search / reverse-geocode within pilot coverage | 1 |
| U3 | Compute A→B route and ETA without vendor traffic | 1 |
| U4 | Turn-by-turn navigation shell (web first) | 1 |
| U5 | Opt-in location sharing with visible consent | 2 |
| U6 | See traffic overlay and improved ETA with confidence | 3–4 |
| U7 | Download a regional offline pack (display ± limited routing) | 5 |
| U8 | Transit routes when a verified feed exists | 6 |

## Scope

**In scope (intent):**

- Reusable server APIs + TypeScript SDKs for map, route, traffic, incidents, offline manifests.
- OSM-derived road network for the pilot region as the routing/map foundation.
- Custom-styled vector tiles suitable for branding and eventual offline packaging.
- Consented probe ingestion, map matching, aggregation, historical profiles.
- Explicit uncertainty and degraded-mode UX (stale traffic, low GPS confidence, no signal).
- Multi-app reuse via `@altr/tia-contracts` / `@altr/tia-sdk` / `@altr/tia-map` (**Proposed** package names).

**Non-goals (pilot and near-term):**

- Nationwide accuracy claims.
- Guaranteed free third-party traffic forever.
- Perfect mock-GPS detection.
- IP geolocation as navigation ground truth.
- Treating OSM way IDs as permanent directed edge IDs.
- Assuming MapLibre calculates routes or that server Valhalla ships a mobile offline SDK.
- Putting Tia geographic logic into Jord or `@altr/base`.
- Microservices-for-their-own-sake; initial deploy stays small ([[01-architecture]]).
- Building Jord jobs/WebSocket/PostGIS during Tia docs — those are Jord track work.

## Pilot assumptions (**Proposed** until chosen)

| Assumption | Default for planning | Must confirm |
|------------|----------------------|--------------|
| First region | One Iranian metro bbox (candidate: Tehran) | User choice |
| First clients | Web (Next + MapLibre GL JS); mobile native MapLibre evaluated later | User choice |
| Routing | Valhalla behind `RoutingProvider` | ADR-02 |
| DB | Dedicated Postgres + PostGIS instance, Jord-managed when Jord can | Blocker: Jord has no PostGIS yet |
| Traffic bootstrap | First-party samples + historical OSM speeds; Neshan optional A/B only | Legal + budget |
| Offline | Display packs before on-device routing | Phase 5 spike |

## Reuse across apps

| Contract surface | Consumers | Rule |
|------------------|-----------|------|
| HTTP/JSON + OpenAPI (when written) | Any altr.lab app | Versioned; breaking changes bump major |
| `@altr/tia-contracts` | Server + clients | Shared IDs, GeoJSON, units |
| `@altr/tia-sdk` | Apps needing routes/ingest | No map renderer inside |
| `@altr/tia-map` | Apps needing MapLibre UI | Style URLs + overlays only |

Apps must not embed ad-hoc copies of road-graph or traffic aggregation logic.

## Coverage and uncertainty visible to users

| Situation | Honest UI (**Proposed**) |
|-----------|---------------------------|
| Outside pilot polygon | Banner: “Outside Tia coverage”; routing disabled or degraded |
| Stale traffic | “Traffic updated N min ago”; opacity/confidence badge |
| Low location accuracy | Larger uncertainty circle; “Position uncertain” |
| Signal loss | Keep last map-matched estimate with growing uncertainty; offer pause |
| Offline pack stale | “Downloaded map may be outdated (version …)” |
| External ETA only | Label source (e.g. partner) separately from Tia-estimated ETA |

Do not show a single confident ETA when provenance is mixed without labeling sources.

## Links

- Architecture: [[01-architecture]] · Backlog: [[11-backlog-roadmap]] · Risks: [[13-risks]]
- Jord truth: [[../Jord/done/overview]] · [[../Jord/todo/05-phase-03-candidates]] · [[../Jord/done/dialects]]
