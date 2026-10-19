---
title: "Tia — architecture decision records"
description: "ADRs for Postgres/PostGIS, Valhalla, MapLibre, memory store, offline staging, partners, and versioning"
created: 2026-10-19
updated: 2026-10-19
tags:
  - feature
  - tia
  - adr
---

# Tia — architecture decision records

> Index: [[README]]. Status values: **Accepted (proposed)** until implemented in code.

## ADR-01 — PostgreSQL + PostGIS vs libSQL for Tia primary store

| | |
|--|--|
| **Status** | Accepted (proposed) |
| **Context** | Jord Slice 0 is libSQL file-only. Tia needs spatial queries, large road graphs, partitioning. |
| **Decision** | Tia’s **primary** server DB is **PostgreSQL + PostGIS** on a **dedicated** instance. Device-side metadata may use SQLite/libSQL. Graphs/tiles are not stored as libSQL blobs by default. |
| **Consequences** | Depends on Jord `PostgresAdapter` + PostGIS **or** interim Tia-owned Postgres. Cannot use `data/jord.db` as spatial system of record. |
| **Revisit** | If Jord ships PostGIS-managed instances; or if a tiny pilot proves SQLite spatial extensions sufficient (unlikely). |

## ADR-02 — Valhalla behind RoutingProvider

| | |
|--|--|
| **Status** | Accepted (proposed) |
| **Context** | Need open routing; may swap engines or add partners. |
| **Decision** | Initial server router = **Valhalla**. All callers use `RoutingProvider`. |
| **Consequences** | Ops cost of graph builds; IR costing rules need work. |
| **Revisit** | If Valhalla IR performance poor → OSRM/GraphHopper; partners only via same interface. |

## ADR-03 — MapLibre + versioned tile schema

| | |
|--|--|
| **Status** | Accepted (proposed) |
| **Context** | Need custom Iran styling and offline path. |
| **Decision** | Web = MapLibre GL JS; tiles self-hosted with `tileSchemaVersion`. Evaluate MapLibre Native for mobile later. |
| **Consequences** | No Mapbox proprietary dependency for core render; style ownership on us. |
| **Revisit** | If Native gaps block mobile nav. |

## ADR-04 — Memory store vs durable delivery

| | |
|--|--|
| **Status** | Accepted (proposed) |
| **Context** | Hot traffic state vs durable probes. Jord Redis is later-only. |
| **Decision** | Durable ingest → Postgres (+ object archive). Redis-compatible store **optional** for ephemeral state. Pub/Sub never sole durability. |
| **Revisit** | When Jord cache pillar exists. |

## ADR-05 — Native vs web navigation first

| | |
|--|--|
| **Status** | Accepted (proposed) |
| **Context** | Faster learning on web; mobile sensors better later. |
| **Decision** | Phase 1 = **web** navigation shell. Mobile Native evaluation in Phase 5 context. |
| **Revisit** | If pilot users are mobile-only. |

## ADR-06 — Offline staging

| | |
|--|--|
| **Status** | Accepted (proposed) |
| **Context** | Offline routing is hard; display is valuable sooner. |
| **Decision** | Stage: (1) display packs (2) continue downloaded route (3) on-device routing after spike. |
| **Revisit** | After TIA-5.3 go/no-go. |

## ADR-07 — Government / Neshan optional

| | |
|--|--|
| **Status** | Accepted (proposed) |
| **Context** | Neshan is paid with time-limited credit; gov feeds unverified. |
| **Decision** | Core product does not depend on Neshan or gov feeds. Optional labeled partner; gov = discovery. |
| **Revisit** | Signed partnerships with clear cache/train rights. |

## ADR-08 — Traffic and graph versioning

| | |
|--|--|
| **Status** | Accepted (proposed) |
| **Context** | Need rollback and client/server compatibility. |
| **Decision** | Every route/traffic response carries `graphVersion` and `trafficVersion` (nullable). Publish/rollback by version pin. OSM way ids are not edge primary keys. |
| **Revisit** | If binary traffic format changes require dual-publish windows. |

## Links

- Architecture: [[01-architecture]] · Data sources: [[02-data-sources]]
