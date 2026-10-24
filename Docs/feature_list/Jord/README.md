---
title: "feature_list/Jord — Jord intent"
description: "Intent index for Jord and Jord Studio. S0001–S0009 shipped"
created: 2026-10-18
updated: 2026-10-23
tags:
  - feature
  - jord
  - Jord-S0001
  - Jord-S0005
  - Jord-S0006
  - Jord-S0009
  - readme
---

# feature_list / Jord

Intent for **Jord** (engine) and **Jord Studio** (control plane). Slice 0 + Studio S1–S7 shipped.

Map: [[../../brain/00-Docs-Brain]] · Idea: [[../../idea/Jord/README]] · Plan: [[../../plan/Jord/README]] · Builder: [[../../agents/mimir/00-index|mimir]] · Lab sequence: [[../../plan/00-roadmap-apolyx-jord-artemis]]

## Truth for this track

| Layer | Role |
|-------|------|
| `idea/Jord/` | R&D and naming record (**complete**) |
| **`feature_list/Jord/`** | **Valid intent** (Slice 0 + Studio vision) |
| `plan/Jord/` | S0001–S0009 **closed** |
| `tech_space/jord/` | [[../../tech_space/jord/00-s0001-slice0]] … [[../../tech_space/jord/08-s0009-triggers-policies]] |
| Code targets | `data/jord.db` · `elements/jord` · `cloud/jord` · `apps/jord-studio` |

## Features

| Note | Status |
|------|--------|
| [[00-intent]] | Slice 0 — **shipped** |
| [[01-later]] | Engine + Supabase-parity pillars + Studio order (S7 done) |
| [[02-architecture]] | `JordDriverPort`, adapters, concurrency, dialect seams, layout |
| [[03-jord-studio]] | Studio surfaces — S1–S7 done |

## Gate

1. ~~Apolyx-S0005~~ — **closed** 2026-10-21.
2. ~~Jord-S0001–S0009~~ — **closed** 2026-10-23.
3. Next: Studio S8+ or Artemis — open a new plan under mimir.
4. Apps stay Apolyx-first (`.cursor/rules/apolyx-first.mdc`).
