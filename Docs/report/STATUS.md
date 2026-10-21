---
title: "Status — complete vs remaining"
description: "Audited snapshot: Jord-S0001–S0006 shipped; next Studio S5 or Artemis"
created: 2026-09-19
updated: 2026-10-21
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
---

# Status

Last updated: 2026-10-21 · Living map: [[../brain/00-Docs-Brain]] · Last ship: **Jord-S0006** (Studio S4 generated API) · No active Jord sprint · Sequence: [[../plan/00-roadmap-apolyx-jord-artemis]]

## Implemented

- **Jord Slice 0 (`Jord-S0001`)** — [[../tech_space/jord/00-s0001-slice0]]
- **Jord Studio S1 (`Jord-S0002`)** — [[../tech_space/jord/01-s0002-studio-s1]]
- **Jord Studio S1.5 (`Jord-S0003`)** — [[../tech_space/jord/02-s0003-studio-shell]]
- **Jord Studio S2 (`Jord-S0004`)** — [[../tech_space/jord/03-s0004-schema]]
- **Jord Studio S3 (`Jord-S0005`)** — [[../tech_space/jord/04-s0005-auth]]
- **Jord Studio S4 (`Jord-S0006`)** — [[../tech_space/jord/05-s0006-generated-api]]
  - Generated API catalog + admin enable/disable (**503** when off)
  - `DELETE /records/:id` completes CRUD
  - Studio **APIs → Generated API** panel (copy curl / try-it)
- **`@altr/apolyx`** through **S0005** · Apolyx-first · docs_man / apollo / mimir

## Planned (repo) — **do next**

1. **Jord Studio S5+** (jobs/logs) — open new `Jord-S000N` · [[../feature_list/Jord/03-jord-studio]]
2. Artemis — idea [[../idea/artemis/README]]
3. Tia — intent [[../feature_list/tia/README]]
4. CI pipeline

## Remaining (Apolyx)

[[../feature_list/ui-kit/01-apolyx-s0001-carryovers]]
