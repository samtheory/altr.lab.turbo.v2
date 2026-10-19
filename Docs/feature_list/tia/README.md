---
title: "feature_list/tia — Tia intent index"
description: "Product and technical intent for Tia (Iran-focused mapping, navigation, live traffic). Spec only; no Tia code in the repo yet"
created: 2026-10-19
updated: 2026-10-19
tags:
  - feature
  - tia
  - map-engine
  - readme
---

# feature_list / tia

Intent for **Tia** — Iran-focused reusable mapping, navigation, and live-traffic platform.

Map: [[../../brain/00-Docs-Brain]] · Idea: [[../../idea/Tia (Map Engine)/README]] · Sharpen: [[../../idea/Tia (Map Engine)/2026-10-19-sharpen]]

> **docs_man placement:** vault pipeline uses `feature_list/tia/` (not a parallel `Docs/tia/`). Overview = this file. Architecture, inventory, backlog, ADRs, and risks are the numbered notes below.

## Truth for this track

| Layer | Role |
|-------|------|
| `idea/Tia (Map Engine)/` | R&D + naming |
| **`feature_list/tia/`** | **Valid product + technical intent (this tree)** |
| `plan/tia/` | Not started — do not invent sprint cards here |
| `tech_space/` | None for Tia |
| Code | **None.** No `elements/tia*`, `cloud/tia`, or `apps/tia` |

## Status legend (use in every note)

| Label | Meaning |
|-------|---------|
| **Verified repo** | Observed in code or accepted Docs that match code |
| **Proposed** | Tia design choice; not implemented |
| **Verified external** | Checked against an official source on a dated visit |
| **Unresolved** | Must be decided or discovered before relying on it |
| **Deferred** | Intentionally later than pilot |

## Repo facts that constrain Tia (2026-10-19)

| Claim | Status |
|-------|--------|
| Monorepo has TypeScript, React/Next (`apps/apolyx`), `@altr/apolyx`, `@altr/base` stubs | **Verified repo** |
| Hono / Bun API packages for products | **Deferred / planned** — sample Hono server removed; Jord-S0001 plans Node Hono for `cloud/jord` (not in tree) |
| `elements/jord`, `cloud/jord`, `data/jord.db` | **Do not exist** — Jord-S0001 ready to implement, not shipped |
| Jord Slice 0 = libSQL `file:` + `LibSqlAdapter` + `records` CRUD | **Verified intent** ([[../Jord/00-intent]]); **not verified in code** |
| Jord `PostgresAdapter` | **Proposed seam / later** — reserved, uninstantiated ([[../Jord/02-architecture]]) |
| PostGIS through Jord | **Unresolved** — not mentioned in Jord intent; Tia needs it as **Proposed** dependency on a future Jord Postgres+PostGIS capability or an explicitly Tia-owned Postgres until Jord catches up |
| Jord jobs, retries, ack, replay, DLQ, backpressure, WebSocket | **Deferred later** in Jord ([[../Jord/01-later]], Studio S5/S9). **Not in Slice 0.** Do not treat as available runtime |
| Redis / cache via Jord | **Deferred later** ([[../Jord/01-later]]) |
| Jord local blob storage | **Deferred later** pillar |
| Dedicated Jord-managed DB instance for Tia | **Proposed** product rule once Jord can provision/select Postgres URLs |

## Documents

| Note | Covers |
|------|--------|
| [[00-intent]] | A — Product definition |
| [[01-architecture]] | B — Architecture, Jord matrix, diagrams |
| [[02-data-sources]] | C — Data-source inventory |
| [[03-schemas]] | D — Schemas and identity |
| [[04-location-quality]] | E — Location quality |
| [[05-traffic-pipeline]] | F — Traffic and learning |
| [[06-rendering-search]] | G — Rendering and search |
| [[07-offline]] | H — Offline design |
| [[08-realtime-infra]] | I — Realtime and infrastructure |
| [[09-security]] | J — Security and stewardship |
| [[10-capacity-ops]] | K — Capacity and operations |
| [[11-backlog-roadmap]] | L — Feature backlog and roadmap |
| [[12-adrs]] | M — Decision records |
| [[13-risks]] | Risks and open questions |

## Proposed package surfaces (not in repo)

| Surface | Path (proposal) | Package (proposal) |
|---------|-----------------|--------------------|
| Shared contracts / Zod types | `elements/tia-contracts` | `@altr/tia-contracts` |
| Server SDK (ingest, route client) | `elements/tia-sdk` | `@altr/tia-sdk` |
| MapLibre React helpers | `elements/tia-map` | `@altr/tia-map` |
| Hono API + workers entry | `cloud/tia` | `@altr/tia-server` |
| Pilot web / docs surface | `apps/tia` | `@altr/tia` |
| Dedicated DB | Jord-managed Postgres+PostGIS instance (URL via env) | — |

Geographic logic stays in Tia packages. Jord remains dialect/port/jobs/streaming host when those capabilities exist.

## Critical blockers before pilot code

1. **Jord Postgres + PostGIS path** does not exist — Slice 0 is libSQL only.
2. **Pilot region** and **tile generation host** are unset.
3. **Consent / legal basis** for driver observation collection in Iran is unset.
4. **Neshan** (and any partner) is optional pay-as-you-go with limited development credit — not a free permanent feed (**Verified external** 2026-10-19).
5. Public OSM tile servers **must not** be used for bulk/offline packs (**Verified external** 2026-10-19).

## User choices needed to start Phase 0–1

1. Pilot city / bounding box.
2. Whether Phase 1 is web-only or also Capacitor.
3. Whether Tia waits for Jord `PostgresAdapter`+PostGIS or runs a temporary Tia-owned Postgres until Jord owns the URL.
4. Whether Neshan is in-scope for Phase 1 ETA A/B only, or deferred entirely.
