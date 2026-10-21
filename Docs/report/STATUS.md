---
title: "Status — complete vs remaining"
description: "Audited snapshot: Jord-S0001–S0007 shipped; next Studio S6 or Artemis"
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
  - Jord-S0007
---

# Status

Last updated: 2026-10-21 · Living map: [[../brain/00-Docs-Brain]] · Last ship: **Jord-S0007** (Studio S5 jobs/logs) · No active Jord sprint · Sequence: [[../plan/00-roadmap-apolyx-jord-artemis]]

## Implemented

- **Jord Slice 0 (`Jord-S0001`)** — [[../tech_space/jord/00-s0001-slice0]]
- **Jord Studio S1–S4** — through [[../tech_space/jord/05-s0006-generated-api]]
- **Jord Studio S5 (`Jord-S0007`)** — [[../tech_space/jord/06-s0007-jobs-logs]]
  - `jord_jobs` / `jord_job_runs` + in-process scheduler
  - Built-in kinds: `wal_checkpoint`, `echo`, `records_count`
  - Log ring + Studio **Jobs** / **Logs** panels
- **`@altr/apolyx`** through **S0005** · Apolyx-first · docs_man / apollo / mimir

## Planned (repo) — **do next**

1. **Jord Studio S6+** (custom/function APIs) — open new `Jord-S000N` · [[../feature_list/Jord/03-jord-studio]]
2. Artemis — idea [[../idea/artemis/README]]
3. Tia — intent [[../feature_list/tia/README]]
4. CI pipeline

## Remaining (Apolyx)

[[../feature_list/ui-kit/01-apolyx-s0001-carryovers]]
