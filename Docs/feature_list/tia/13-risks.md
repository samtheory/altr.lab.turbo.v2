---
title: "Tia — risks and open questions"
feature_id: tia-F0014
description: "Blockers, uncertainties, and user choices required before pilot implementation"
created: 2026-10-19
updated: 2026-10-19
tags:
  - feature
  - tia
  - risks
---

# Tia — risks and open questions

> Index: [[README]].

## Critical blockers

| ID | Risk | Why it blocks |
|----|------|---------------|
| B1 | Jord has **no code**; Slice 0 is libSQL-only; **PostGIS unmentioned** | Cannot honestly “use Jord-managed PostGIS” today |
| B2 | Pilot **region unset** | Cannot size tiles/graph/offline |
| B3 | **Legal basis** for probe collection in Iran unset | Blocks Phase 2 production |
| B4 | Public OSM **tile** servers forbid bulk/offline | Must self-host tiles before packs |
| B5 | No Tia packages/apps in monorepo | All work is greenfield after docs |

## Major risks

| Risk | Mitigation |
|------|------------|
| Sparse first-party probes → useless live traffic | Historical + freeflow; honest UI; don’t claim live |
| Partner Terms forbid training/cache | Keep partner as labeled ETA only |
| Valhalla IR costing wrong | Manual tag QA; local rule overlays |
| GPS urban canyon / tunnels | Quality subsystem; degraded UX |
| Scope creep to “Google Maps clone” | Non-goals in [[00-intent]]; phase gates |

## Open questions (need owner answers)

1. Pilot city / bbox?
2. Web-only Phase 1, or Capacitor from day one?
3. Wait for Jord Postgres+PostGIS vs temporary Tia-owned Postgres?
4. Include Neshan in Phase 1–4 budget or defer entirely?
5. Who owns IR privacy/legal review before Phase 2?
6. Object storage vendor (MinIO local vs cloud) for pilot?
7. Preferred tile build toolchain after spike?

## What is explicitly not claimed

- Nationwide accuracy
- Free permanent third-party traffic
- Guaranteed GNSS recovery
- Production readiness
- Existing Jord jobs/WebSocket/PostGIS

## Links

- Backlog: [[11-backlog-roadmap]] · Architecture verification: [[01-architecture]]
