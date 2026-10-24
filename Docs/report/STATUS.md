---
title: "Status — complete vs remaining"
description: "Audited snapshot: Jord-S0001–S0009 shipped; next Studio S8 or Artemis"
created: 2026-09-19
updated: 2026-10-23
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
---

# Status

Last updated: 2026-10-23 · Living map: [[../brain/00-Docs-Brain]] · Last ship: **Jord-S0009** (Studio S7 triggers + policies) · No active Jord sprint · Sequence: [[../plan/00-roadmap-apolyx-jord-artemis]]

## Implemented

- **Jord Slice 0 (`Jord-S0001`)** — [[../tech_space/jord/00-s0001-slice0]]
- **Jord Studio S1–S6** — through [[../tech_space/jord/07-s0008-custom-function-apis]]
- **Jord Studio S7 (`Jord-S0009`)** — [[../tech_space/jord/08-s0009-triggers-policies]]
  - `jord_policies` / `jord_triggers` + built-in rule/action kinds
  - Middleware deny → **403** `policy_denied`; AFTER write trigger hooks
  - Studio **Database → Policies** / **Triggers** panels
- **`@altr/apolyx`** through **S0005** · Apolyx-first · docs_man / apollo / mimir

## Planned (repo) — **do next**

1. **Jord Studio S8+** (Postgres / realtime / blobs / vectors) — open new `Jord-S000N` · [[../feature_list/Jord/03-jord-studio]]
2. Artemis — idea [[../idea/artemis/README]]
3. Tia — intent [[../feature_list/tia/README]]
4. CI pipeline

## Remaining (Apolyx)

[[../feature_list/ui-kit/01-apolyx-s0001-carryovers]]
