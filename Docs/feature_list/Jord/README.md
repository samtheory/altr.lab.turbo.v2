---
title: "feature_list/Jord — Jord intent"
description: "Intent index for Jord and Jord Studio. S0001–S0006 shipped"
created: 2026-10-18
updated: 2026-10-21
tags:
  - feature
  - jord
  - Jord-S0001
  - Jord-S0005
  - Jord-S0006
  - readme
---

# feature_list / Jord

Intent for **Jord** (engine) and **Jord Studio** (control plane). Slice 0 + Studio S1–S4 are shipped.

Map: [[../../brain/00-Docs-Brain]] · Idea: [[../../idea/Jord/README]] · Plan: [[../../plan/Jord/README]] · Builder: [[../../agents/mimir/00-index|mimir]] · Lab sequence: [[../../plan/00-roadmap-apolyx-jord-artemis]]

## Truth for this track

| Layer | Role |
|-------|------|
| `idea/Jord/` | R&D and naming record (**complete**) |
| **`feature_list/Jord/`** | **Valid intent** (Slice 0 + Studio vision) |
| `plan/Jord/` | S0001–S0006 **closed** |
| `tech_space/jord/` | [[../../tech_space/jord/00-s0001-slice0]] … [[../../tech_space/jord/05-s0006-generated-api]] |
| Code targets | `data/jord.db` · `elements/jord` · `cloud/jord` · `apps/jord-studio` |

## Features

| Note | Status |
|------|--------|
| [[00-intent]] | Slice 0 — **shipped** |
| [[01-later]] | Engine + Supabase-parity pillars + Studio order (S4 done) |
| [[02-architecture]] | `JordDriverPort`, adapters, concurrency, dialect seams, layout |
| [[03-jord-studio]] | Studio surfaces — S1–S4 done |

## Gate

1. ~~Apolyx-S0005~~ — **closed** 2026-10-21.
2. ~~Jord-S0001–S0006~~ — **closed** 2026-10-21.
3. Next: Studio S5+ or Artemis — open a new plan under mimir.
4. Apps stay Apolyx-first (`.cursor/rules/apolyx-first.mdc`).
