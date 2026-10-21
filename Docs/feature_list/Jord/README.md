---
title: "feature_list/Jord — Jord intent"
description: "Intent index for Jord and Jord Studio. S0001 is the active implement track after Apolyx-S0005 closed."
created: 2026-10-18
updated: 2026-10-21
tags:
  - feature
  - jord
  - Jord-S0001
  - readme
---

# feature_list / Jord

Intent for **Jord** (engine) and **Jord Studio** (control plane). **Implement Slice 0 now.**

Map: [[../../brain/00-Docs-Brain]] · Idea: [[../../idea/Jord/README]] · Plan: [[../../plan/Jord/README]] · Builder: [[../../agents/mimir/00-index|mimir]] · Lab sequence: [[../../plan/00-roadmap-apolyx-jord-artemis]]

## Truth for this track

| Layer | Role |
|-------|------|
| `idea/Jord/` | R&D and naming record (**complete**) |
| **`feature_list/Jord/`** | **Valid intent** (**complete** for Slice 0 + Studio vision) |
| `plan/Jord/` | [[../../plan/Jord/Jord-S0001/README]] ready (cards 1–8). Code not started — **implement now** |
| `tech_space/` | None yet |
| Code targets | `data/jord.db` · `elements/jord` · `cloud/jord` · later `apps/jord-studio` |

## Features

| Note | Status |
|------|--------|
| [[00-intent]] | Slice 0: `LibSqlAdapter`, WAL + truncate checkpoints, OCC `version`, 64-bit timestamps, mkdir `data/`, snapshot, `@altr/jord-server` |
| [[01-later]] | Engine + Supabase-parity pillars (CDC, blobs, vectors) + Studio order |
| [[02-architecture]] | `JordDriverPort`, adapters, concurrency, dialect seams, layout |
| [[03-jord-studio]] | Studio surfaces — Apolyx gate shipped ([[../ui-kit/06-apolyx-s0005-product-gate]]) |

## Gate

1. ~~Apolyx-S0005~~ — **closed** 2026-10-21 ([[../../tech_space/ui-kit/10-s0005-product-gate]]).
2. **Implement Jord-S0001** starting at [[../../plan/Jord/Jord-S0001/01-packages]].
3. Studio packages wait until Slice 0 is done. Apps stay Apolyx-first (`.cursor/rules/apolyx-first.mdc`).
