---
title: "Tia — rendering and search"
description: "MapLibre styles, vector tiles, Persian/RTL, traffic overlays, and geocoding as a separate service"
created: 2026-10-19
updated: 2026-10-19
tags:
  - feature
  - tia
  - maplibre
  - search
---

# Tia — rendering and search

> Index: [[README]]. Offline assets: [[07-offline]].

## Vector tiles

| Topic | Decision (**Proposed**) |
|-------|-------------------------|
| Generator | Build from OSM extract (Planetiler / tippecanoe / equivalent — spike) |
| Schema | Versioned `tileSchemaVersion`; document layer names |
| Hosting | Self-hosted or CDN from object storage — **not** `tile.openstreetmap.org` for production/offline |
| Style | MapLibre style JSON referencing Tia sources |

## MapLibre

| Client | Choice |
|--------|--------|
| Web | **MapLibre GL JS** (ADR-03) |
| Mobile | Evaluate **MapLibre Native** — not assumed Phase 1 |

Apolyx wraps chrome; MapLibre owns the canvas/WebGL map.

## Style sources and layers (**Proposed**)

- Basemap: land, water, roads, buildings, labels.
- Overlays: traffic (data-driven color by speed/confidence), incidents, route line, user location accuracy circle.
- Themes: day / night / high-contrast (a11y).
- Traffic layer hidden when `trafficVersion` absent or expired.

## Persian, RTL, bilingual

| Concern | Approach (**Proposed**) |
|---------|-------------------------|
| Shaping | Fonts that support Persian shaping |
| RTL | UI chrome RTL via app layout; map labels follow data `name:fa` / `name` |
| Bilingual | Prefer `name:fa` in IR; fallback `name` / `name:en` |
| Normalization | Arabic/Persian yeh/kaf variants; strip tatweel for search keys |
| Aliases | Alias table for common misspellings |

## Geocoding

Geocoding is a **separate service/API** from routing and from MapLibre.

| Option | Status |
|--------|--------|
| Self-hosted Nominatim / Photon on IR extract | **Proposed** pilot |
| Commercial geocoder | Optional; license review |
| Neshan search/geocode APIs | **Paid**; same credit limits as other Neshan services |

Do not embed geocoding inside the style JSON.

## Fonts, sprites, attribution, offline

- Bundle or host glyphs/sprites with style version.
- Visible OSM (and other) attribution on map.
- Offline packs include fonts/sprites listed in manifest ([[03-schemas]]).

## Links

- Data sources: [[02-data-sources]] · Offline: [[07-offline]]
