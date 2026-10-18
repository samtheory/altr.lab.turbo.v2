---
title: "feature_list/Jord — Jord intent"
description: "Intent index for Jord and Jord Studio. S0001 plan is ready to implement. Architecture and Studio vision documented."
created: 2026-10-18
updated: 2026-10-18
tags:
  - feature
  - jord
  - readme
---

# feature_list / Jord

Intent for **Jord** (engine) and **Jord Studio** (control plane).

Map: [[../../brain/00-Docs-Brain]] · Idea: [[../../idea/Jord/README]] · Plan: [[../../plan/Jord/README]]

## Truth for this track

| Layer | Role |
|-------|------|
| `idea/Jord/` | R&D and naming record |
| **`feature_list/Jord/`** | **Valid intent** |
| `plan/Jord/` | [[../../plan/Jord/Jord-S0001/README]] ready to implement (cards 1–8). Code not started |
| `tech_space/` | None yet |
| Code targets | `data/jord.db` · `elements/jord` · `cloud/jord` · later `apps/jord-studio` |

## Features

| Note | Status |
|------|--------|
| [[00-intent]] | Slice 0: `LibSqlAdapter`, WAL + truncate checkpoints, OCC `version`, 64-bit timestamps, mkdir `data/`, snapshot, `@altr/jord-server` |
| [[01-later]] | Engine + Supabase-parity pillars (CDC, blobs, vectors) + Studio order |
| [[02-architecture]] | `JordDriverPort`, adapters, concurrency, dialect seams, layout |
| [[03-jord-studio]] | Studio surfaces + realtime / blobs / vectors roadmap |

## Gate

S0001 plan is ready. Next step is implementation, starting at [[../../plan/Jord/Jord-S0001/01-packages]]. Studio packages wait until that sprint is done.
