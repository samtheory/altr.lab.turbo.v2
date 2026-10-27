---
title: "Tia — schemas and identity"
feature_id: tia-F0004
description: "Conceptual TypeScript contracts and DB models for geography, routing, traffic, transit, and offline — units and WGS84 explicit"
created: 2026-10-19
updated: 2026-10-19
tags:
  - feature
  - tia
  - schemas
---

# Tia — schemas and identity

> Index: [[README]]. All sketches are **Proposed**. Coordinates: **WGS84**, GeoJSON **`[longitude, latitude]`**. Speeds in **km/h** unless noted. Distances in **meters**. Times as Unix **milliseconds** (int64-safe), with named timestamps.

## Schema families

| Family | Examples | Storage |
|--------|----------|---------|
| Geographic | segments, nodes, incident polygons | PostGIS |
| Routing | graph versions, directed edges, mappings | PostGIS + object storage artifacts |
| Traffic | observations, aggregates, profiles | PostGIS; hot cache optional Redis |
| Display | style versions, tile schema versions | Object storage + DB manifests |
| Transit | stops, trips, RT updates | PostGIS when feeds exist |
| Offline | pack manifests, permissions | Postgres + object storage |

## Identity rules

| ID | Rule |
|----|------|
| `observationId` | Client- or server-generated UUID; unique with `clientDedupKey` |
| `traceId` | Opaque trip/session id; **not** the user account id |
| `userId` / `subjectId` | Auth identity; stored separately from traces when possible |
| `edgeId` | **Tia** directed routing-edge id; stable within `graphVersion` |
| `osmWayId` | Source reference only — **never** treat as permanent directed edge id |
| `graphVersion` / `trafficVersion` / `styleVersion` / `tileSchemaVersion` | Explicit strings on every route/traffic response |

## Conceptual TypeScript contracts (**Proposed**)

```ts
export type LonLat = [number, number]; // [lon, lat] WGS84

export type TimestampMs = number;

export interface LocationObservationRaw {
  observationId: string;
  clientDedupKey: string;
  traceId: string;
  subjectIdHash?: string; // optional unlinkable handle
  capturedAt: TimestampMs;   // device clock at GNSS fix
  receivedAt?: TimestampMs;  // server receipt
  position: LonLat;
  accuracyM?: number;
  altitudeM?: number;
  speedMps?: number;
  headingDeg?: number; // 0–360
  provider: "gps" | "network" | "fused" | "unknown";
  isMockSuspect?: boolean;
  batteryPct?: number;
  appState: "foreground" | "background" | "unknown";
}

export interface LocationEstimate {
  observationId: string;
  processedAt: TimestampMs;
  expiresAt?: TimestampMs;
  position: LonLat;
  accuracyM: number;
  mapMatched?: {
    edgeId: string;
    graphVersion: string;
    fractionAlong: number; // 0–1
    confidence: number; // 0–1
  };
  motionState: "stopped" | "walking" | "driving" | "unknown";
}

export interface DirectedSegment {
  edgeId: string;
  graphVersion: string;
  fromNodeId: string;
  toNodeId: string;
  lengthM: number;
  geometry: GeoJSON.LineString; // lon/lat
  osmWayIds: string[]; // references only
  roadClass: string;
  freeflowSpeedKph?: number;
}

export interface GraphEdgeMapping {
  graphVersion: string;
  edgeId: string;
  source: "osm" | "manual";
  sourceRefs: Array<{ kind: "osm_way"; id: string; direction: "forward" | "backward" | "both" }>;
}

export interface TrafficObservation {
  trafficObsId: string;
  edgeId: string;
  graphVersion: string;
  traversedAt: TimestampMs; // mid-traversal estimate
  processedAt: TimestampMs;
  travelTimeS: number;
  impliedSpeedKph: number;
  sampleWeight: number;
  traceId: string; // for audit; not for broadcast
}

export interface TrafficEdgeState {
  edgeId: string;
  graphVersion: string;
  trafficVersion: string;
  speedKph: number;
  confidence: number;
  sampleCount: number;
  windowStart: TimestampMs;
  windowEnd: TimestampMs;
  publishedAt: TimestampMs;
  expiresAt: TimestampMs;
}

export interface HistoricalSpeedProfile {
  edgeId: string;
  graphVersion: string;
  // 0–167 = hour-of-week or similar bucket scheme (document in code)
  bucket: number;
  p50SpeedKph: number;
  p85SpeedKph?: number;
  sampleCount: number;
  updatedAt: TimestampMs;
}

export interface Incident {
  incidentId: string;
  type: "closure" | "accident" | "construction" | "hazard" | "other";
  geometry: GeoJSON.Geometry;
  severity: 1 | 2 | 3 | 4 | 5;
  source: string;
  validFrom: TimestampMs;
  validTo?: TimestampMs;
  attribution?: string;
}

export interface RouteResult {
  routeId: string;
  graphVersion: string;
  trafficVersion: string | null;
  geometry: GeoJSON.LineString;
  distanceM: number;
  durationS: number;
  etaProvenance: Array<{
    kind: "freeflow" | "historical" | "live_tia" | "partner_route";
    source?: string;
    share: number; // 0–1 of duration attribution
  }>;
  maneuvers: Maneuver[];
}

export interface Maneuver {
  type: string;
  instruction: string; // locale-ready key or text
  position: LonLat;
  bearingBeforeDeg?: number;
  bearingAfterDeg?: number;
  distanceToM?: number;
}

export interface TransitStop {
  stopId: string;
  name: string;
  nameFa?: string;
  position: LonLat;
  sourceFeed: string;
}

export interface TransitTripUpdate {
  tripId: string;
  feedTimestamp: TimestampMs;
  delayS?: number;
  position?: LonLat;
}

export interface OfflinePackManifest {
  packId: string;
  regionId: string;
  bbox: [number, number, number, number]; // west,south,east,north
  tileSchemaVersion: string;
  styleVersion: string;
  graphVersion?: string; // if on-device routing included
  byteSize: number;
  createdAt: TimestampMs;
  sourcePermissions: Array<{ source: string; allowsOffline: boolean; notes: string }>;
  content: Array<{ kind: "tiles" | "style" | "fonts" | "graph"; objectKey: string; checksum: string }>;
}
```

## Database model sketch (**Proposed** Postgres + PostGIS)

| Table | Purpose | Notes |
|-------|---------|-------|
| `raw_observations` | Durable ingest | Partition by `received_at`; PII minimized |
| `location_estimates` | Map-matched outputs | Separate from raw |
| `nodes` / `directed_edges` | Graph for `graph_version` | `geography(LineString, 4326)` |
| `edge_source_map` | OSM ↔ edge | Many-to-one; ways not unique keys |
| `traffic_observations` | Per-traversal estimates | |
| `traffic_edge_state` | Published aggregates | Keyed by `traffic_version` |
| `speed_profiles` | Historical | |
| `incidents` | Closures etc. | |
| `routes_cache` | Optional short TTL | Not source of truth |
| `offline_packs` | Manifests | |
| `transit_*` | When feeds verified | Empty until Phase 6 |

## Timestamp vocabulary

| Name | Meaning |
|------|---------|
| `capturedAt` | Sensor time on device |
| `receivedAt` | Server accept time |
| `processedAt` | After match/aggregate |
| `publishedAt` | Made visible to clients |
| `expiresAt` / `validTo` | Soft expiry for UI freshness |

## Links

- Location quality: [[04-location-quality]] · Traffic: [[05-traffic-pipeline]]
