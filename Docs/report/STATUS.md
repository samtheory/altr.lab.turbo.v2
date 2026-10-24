---
title: "Status — complete vs remaining"
description: "Jord phase-01 shipped; S0027 CI workflow added locally; phase-02 auth not started"
created: 2026-09-19
updated: 2026-10-24
tags:
  - report
  - status
  - jord
  - phase-01
  - phase-02
---

# Status

Last updated: 2026-10-24 · Living map: [[../brain/00-Docs-Brain]] · Last ship: **Jord-S0020** · **Phase-01 closed** · **S0027** workflow + overview CI note landed locally (Actions / branch-protection `jord` still **UNVERIFIED**) · Plan review: [[Jord-phase-02-plan-review]] · Shipped review: [[Jord-implemented-review]]

## Implemented

- **Jord phase-01 (S0001–S0020)** — matrix in [[Jord-implemented-review]] · handoff [[Jord-technical-brief]] · capabilities [[../feature_list/Jord/04-phase-01-capabilities]]
- Plans archive: [[../plan/Jord/phase-01/README]] · As-built manual: [[../tech_space/jord/README]]
- **`@altr/apolyx`** through **S0005** · Apolyx-first
- **Jord-S0027 (local)** — `.github/workflows/jord.yml` · CI note [[../tech_space/jord/overview/README#ci]] · card [[../plan/Jord/phase-02/Jord-S0027/README]]

## In progress

_(none — S0027 awaiting PR / Actions green + admin branch protection)_

## Planned (repo)

Phase-02 features: [[../feature_list/Jord/03-phase-02-features]] · Queue: [[../plan/Jord/phase-02/README]]

Execution (ids are not this order): **S0027** CI (workflow in tree) → **S0021** A/B/ADR/C → **S0028** hardening → **S0022** table API → **S0023** CDC → **S0029** client → **S0024** Studio → **S0025** storage → **S0026** functions ADR only.

Soft leftovers: [[../feature_list/Jord/01-phase-02-candidates]] · Artemis · Tia

## Remaining (Apolyx)

[[../feature_list/ui-kit/01-apolyx-s0001-carryovers]]
