---
title: "feature_list/Jord — Jord intent"
description: "Intent index for Jord and Jord Studio. S0001–S0011 shipped"
created: 2026-10-18
updated: 2026-10-24
tags:
  - feature
  - jord
  - Jord-S0001
  - Jord-S0005
  - Jord-S0006
  - Jord-S0009
  - Jord-S0011
  - readme
---

# feature_list / Jord

Intent for **Jord** (engine) and **Jord Studio** (control plane). Slice 0 + Studio S1–S9 shipped.

Map: [[../../brain/00-Docs-Brain]] · Idea: [[../../idea/Jord/README]] · Plan: [[../../plan/Jord/README]] · Builder: [[../../agents/mimir/00-index|mimir]] · Lab sequence: [[../../plan/00-roadmap-apolyx-jord-artemis]]

## Truth for this track

| Layer | Role |
|-------|------|
| `idea/Jord/` | R&D and naming record (**complete**) |
| **`feature_list/Jord/`** | **Valid intent** (Slice 0 + Studio vision) |
| `plan/Jord/` | S0001–S0011 **closed** · [[../../plan/Jord/README]] |
| `tech_space/jord/` | [[../../tech_space/jord/00-s0001-slice0]] … [[../../tech_space/jord/10-s0011-realtime]] |
| Code targets | `data/jord.db` · `elements/jord` · `cloud/jord` · `apps/jord-studio` |

## Features

| Note | Status |
|------|--------|
| [[00-intent]] | Slice 0 — **shipped** |
| [[01-later]] | Engine + Supabase-parity pillars + Studio order (S9 done; S10+) |
| [[02-architecture]] | `JordDriverPort`, adapters, concurrency, dialect seams, layout |
| [[03-jord-studio]] | Studio surfaces — S1–S9 done · as-built [[../../tech_space/jord/10-s0011-realtime]] |

## Gate

1. ~~Apolyx-S0005~~ — **closed** 2026-10-21.
2. ~~Jord-S0001–S0011~~ — **closed** 2026-10-24 (S9 as-built [[../../tech_space/jord/10-s0011-realtime]]).
3. **Next to plan:** Studio S10 blobs, then S11 vectors — or Artemis product gate.
4. Apps stay Apolyx-first (`.cursor/rules/apolyx-first.mdc`).
