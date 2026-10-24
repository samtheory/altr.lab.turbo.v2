---
title: "Status — complete vs remaining"
description: "Audited snapshot: Jord-S0001–S0010 shipped; next Artemis / Studio S9"
created: 2026-09-19
updated: 2026-10-24
tags:
  - report
  - status
  - Apolyx-S0005
  - Jord-S0001
  - Jord-S0002
  - Jord-S0003
  - Jord-S0004
  - Jord-S0005
  - Jord-S0006
  - Jord-S0007
  - Jord-S0008
  - Jord-S0009
  - Jord-S0010
---

# Status

Last updated: 2026-10-24 · Living map: [[../brain/00-Docs-Brain]] · Last ship: **Jord-S0010** (Studio S8 Postgres) · **Active Jord sprint:** none · Sequence: [[../plan/00-roadmap-apolyx-jord-artemis]]

## Implemented

- **Jord Slice 0 (`Jord-S0001`)** — [[../tech_space/jord/00-s0001-slice0]]
- **Jord Studio S1–S7** — through [[../tech_space/jord/08-s0009-triggers-policies]]
- **Jord Studio S8 (`Jord-S0010`)** — [[../tech_space/jord/09-s0010-postgres]]
  - `PostgresAdapter` + `file:` / `postgres://` / `postgresql://` dispatch
  - `/health` dialect; WAL only on libSQL
  - Studio **Database → Connection** (dialect badge; no URL in UI/JSON)
- **`@altr/apolyx`** through **S0005** · Apolyx-first · docs_man / apollo / mimir

## Planned (repo) — **do next**

1. Artemis — idea [[../idea/artemis/README]] (product gate after S8)
2. Jord Studio S9+ (realtime / blobs / vectors) — open a plan when mimir starts the next Jord card · [[../feature_list/Jord/03-jord-studio]]
3. Tia — intent [[../feature_list/tia/README]]
4. CI pipeline

## Remaining (Apolyx)

[[../feature_list/ui-kit/01-apolyx-s0001-carryovers]]
