---
title: "Tia — feature backlog and roadmap"
feature_id: tia-F0012
description: "Phased features with acceptance criteria, metrics, licensing gates, and open questions"
created: 2026-10-19
updated: 2026-10-19
tags:
  - feature
  - tia
  - backlog
  - roadmap
---

# Tia — feature backlog and roadmap

> Index: [[README]]. Priority: P0 blocker → P3 later. Complexity: S/M/L/XL. No arbitrary SLAs.

## Phase overview

| Phase | Name | Outcome |
|-------|------|---------|
| 0 | Repo and data-access validation | Honest stack + extract/tile path proven |
| 1 | Pilot map, search, base routes, nav UI | Usable web pilot in one region |
| 2 | Consented location + quality eval | Durable probes; match quality measured |
| 3 | Live traffic aggregation + ETA validation | Edge speeds + held-out ETA metrics |
| 4 | Traffic-aware routing + optional partners | Valhalla traffic versions; labeled partner A/B |
| 5 | Regional offline + on-device routing spike | Display packs; routing feasibility recorded |
| 6 | Broader coverage + verified transit | Expand bbox; transit only if feeds verified |

---

## Phase 0 — validation

### TIA-0.1 Jord / Postgres / PostGIS path
- **Outcome:** Documented decision: wait for Jord Postgres+PostGIS vs temporary Tia-owned Postgres.
- **Priority:** P0 · **Complexity:** M · **Subsystem:** infrastructure
- **Deps:** Jord track ([[../Jord/done/overview]])
- **Acceptance:** Written ADR addendum; env var names; no false claim that PostGIS works via Jord today.
- **Metrics:** n/a
- **Licensing:** n/a
- **Open:** User choice ([[13-risks]])

### TIA-0.2 OSM extract + tile build spike
- **Outcome:** Pilot bbox extract builds vector tiles served locally.
- **Priority:** P0 · **Complexity:** L · **Subsystem:** tiles
- **Acceptance:** MapLibre loads tiles for bbox; attribution present; **not** using OSMF public tiles for packaging.
- **Metrics:** Tile build time; pack size MB
- **Licensing:** ODbL attribution; OSMF tile policy respected
- **Open:** Toolchain choice (Planetiler vs other)

### TIA-0.3 Valhalla graph for pilot bbox
- **Outcome:** Valhalla returns a route for two points in bbox.
- **Priority:** P0 · **Complexity:** L · **Subsystem:** routing
- **Acceptance:** `RoutingProvider` stub calls Valhalla; response includes distance/duration/geometry.
- **Metrics:** Cold-start time; route latency sample (informational)
- **Licensing:** OSM-derived graph ODbL
- **Open:** Costing profiles for IR traffic rules

### TIA-0.4 Neshan terms skim (optional)
- **Outcome:** Legal/product note: what is allowed to cache/compare.
- **Priority:** P2 · **Complexity:** S · **Subsystem:** partnerships
- **Acceptance:** Checklist filed under data-sources; no production key required for doc-only.
- **Licensing gate:** Must pass before any production Neshan calls

---

## Phase 1 — pilot map / search / routes / nav UI

### TIA-1.1 Styled MapLibre map
- **Outcome:** Day style map of pilot region in `apps/tia` (**Proposed**).
- **Priority:** P0 · **Complexity:** M · **Subsystem:** rendering
- **Deps:** TIA-0.2
- **Acceptance:** Pan/zoom; Persian labels where data exists; attribution visible.
- **Metrics:** Time to first map render (measure later)

### TIA-1.2 Geocoding / search
- **Outcome:** Forward search returns lon/lat in coverage.
- **Priority:** P0 · **Complexity:** M · **Subsystem:** search
- **Acceptance:** Query “pilot landmark” returns sensible hit; outside coverage empty/error.
- **Open:** Nominatim vs other

### TIA-1.3 Base routing API + UI
- **Outcome:** A→B route drawn; ETA shown with provenance `freeflow` or static.
- **Priority:** P0 · **Complexity:** M · **Subsystem:** routing
- **Deps:** TIA-0.3
- **Acceptance:** `graphVersion` returned; maneuvers listed; no traffic claimed.
- **Metrics:** Route success rate in bbox

### TIA-1.4 Navigation shell
- **Outcome:** Follow route with next maneuver (web).
- **Priority:** P1 · **Complexity:** L · **Subsystem:** nav-ui
- **Acceptance:** Recenter; off-route detection offline-capable only as “lost GPS” UX — **no** claim of full reroute without server if online-only.
- **Open:** Voice guidance deferred

### TIA-1.5 SDK contracts package
- **Outcome:** `@altr/tia-contracts` publishes shared types used by API and app.
- **Priority:** P1 · **Complexity:** S · **Subsystem:** contracts
- **Acceptance:** App and server import same `RouteResult` shape.

---

## Phase 2 — consented location

### TIA-2.1 Consent UX + flags
- **Outcome:** User can grant/revoke probe upload.
- **Priority:** P0 · **Complexity:** M · **Subsystem:** security/client
- **Licensing/legal gate:** Counsel note for IR before production
- **Acceptance:** Default off; revoke stops uploads within one batch interval.

### TIA-2.2 Batched ingest API
- **Outcome:** Durable idempotent observation batches.
- **Priority:** P0 · **Complexity:** M · **Subsystem:** ingest
- **Acceptance:** Replay same `clientDedupKey` does not duplicate; raw ≠ estimate tables.
- **Metrics:** Accept/reject counts

### TIA-2.3 Map-matching v1 + quality report
- **Outcome:** Estimates with confidence; offline eval notebook/report.
- **Priority:** P0 · **Complexity:** L · **Subsystem:** matching
- **Acceptance:** Parallel-road test set documented; confidence calibrated qualitatively.
- **Metrics:** Match confidence distribution; tunnel gap behavior notes

---

## Phase 3 — live traffic + ETA validation

### TIA-3.1 Aggregation windows
- **Outcome:** `traffic_edge_state` published with freshness.
- **Priority:** P0 · **Complexity:** L · **Subsystem:** traffic
- **Deps:** Phase 2 data volume
- **Acceptance:** Edges below confidence not published; UI shows age.
- **Metrics:** Coverage % of navigable edges with live state

### TIA-3.2 Historical profiles
- **Outcome:** Time-of-week fallback speeds.
- **Priority:** P1 · **Complexity:** M · **Subsystem:** traffic
- **Acceptance:** Missing live → profile → freeflow chain works.

### TIA-3.3 Held-out ETA evaluation
- **Outcome:** Baseline error metrics vs freeflow.
- **Priority:** P0 · **Complexity:** M · **Subsystem:** eval
- **Acceptance:** Documented methodology; no model trained on held-out set.
- **Metrics:** MAE / p90 ETA error (measured, not promised)

---

## Phase 4 — traffic-aware routing + partners

### TIA-4.1 Publish traffic into Valhalla
- **Outcome:** Routes use `trafficVersion`.
- **Priority:** P0 · **Complexity:** L · **Subsystem:** routing/traffic
- **Acceptance:** Response includes versions; rollback switches versions.
- **Metrics:** ETA error vs Phase 3 baseline

### TIA-4.2 Optional Neshan A/B (labeled)
- **Outcome:** Side-by-side partner ETA when enabled.
- **Priority:** P2 · **Complexity:** M · **Subsystem:** partnerships
- **Licensing gate:** Terms allow comparison use; paid budget
- **Acceptance:** UI labels partner; no raw speeds ingested unless permitted.
- **Deps:** TIA-0.4

### TIA-4.3 Incident overlay
- **Outcome:** Closures/hazards on map when sourced.
- **Priority:** P2 · **Complexity:** M · **Subsystem:** incidents
- **Open:** Source feed — first-party reports vs partner

---

## Phase 5 — offline

### TIA-5.1 Offline display packs
- **Outcome:** Download region; view map offline.
- **Priority:** P1 · **Complexity:** L · **Subsystem:** offline
- **Acceptance:** Manifest checksum; stale banner; interrupted download resume.
- **Metrics:** Pack size; download success rate

### TIA-5.2 Continue downloaded route
- **Outcome:** Show cached route without network.
- **Priority:** P1 · **Complexity:** S · **Subsystem:** offline/nav
- **Acceptance:** Maneuvers available offline; no new route compute claimed.

### TIA-5.3 On-device routing spike
- **Outcome:** Go/no-go report.
- **Priority:** P1 · **Complexity:** XL · **Subsystem:** offline/routing
- **Acceptance:** Written feasibility with sizes and timings **or** explicit defer.
- **Open:** Engine choice

---

## Phase 6 — coverage + transit

### TIA-6.1 Expand coverage
- **Outcome:** Additional cities with same pipeline.
- **Priority:** P2 · **Complexity:** L
- **Acceptance:** Per-region graph/tile versions; no “nationwide accurate” marketing.

### TIA-6.2 Transit discovery
- **Outcome:** Inventory of GTFS/RT feeds with licenses.
- **Priority:** P3 · **Complexity:** M
- **Acceptance:** Feeds marked verified or unverified; no fake realtime UI.
- **Licensing gate:** Operator permission

---

## Links

- Product: [[00-intent]] · Risks: [[13-risks]]
