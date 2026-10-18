---
title: "feature_list/Jord — Jord intent"
description: "Intent index for Jord and Jord Studio. S0001 not started. Architecture and Studio vision documented."
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
| `plan/Jord/` | [[../../plan/Jord/Jord-S0001/README]] opened, not started |
| `tech_space/` | None yet |
| Code targets | `data/jord.db` · `elements/jord` · `cloud/jord` · later `apps/jord-studio` |

## Features

| Note | Status |
|------|--------|
| [[00-intent]] | S0001 / Slice 0: file + WAL pragmas + `records` scratchpad + snapshot + `@altr/jord` + `@altr/jord-server` |
| [[01-later]] | Engine and Studio slice order |
| [[02-architecture]] | libSQL fit, Drizzle→Postgres, modular layout |
| [[03-jord-studio]] | Studio surfaces: tables, visualizer, jobs, logs, auth, APIs, triggers, policies, roles |

## Gate

S0001 is planned and not started. Studio packages wait until that plan is done.
