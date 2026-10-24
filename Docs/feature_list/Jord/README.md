---
title: "feature_list/Jord — Jord intent"
description: "Intent index for Jord and Jord Studio. S0001–S0016 shipped; next is S0017"
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
  - Jord-S0012
  - Jord-S0013
  - Jord-S0014
  - readme
---

# feature_list / Jord

Intent for **Jord** (engine) and **Jord Studio** (control plane). Slice 0 + Studio through **S0016** (schema DROP / RENAME / type) shipped.

Map: [[../../brain/00-Docs-Brain]] · Idea: [[../../idea/Jord/README]] · Plan: [[../../plan/Jord/README]] · Review: [[../../report/Jord-implemented-review]] · Builder: [[../../agents/mimir/00-index|mimir]] · Lab sequence: [[../../plan/00-roadmap-apolyx-jord-artemis]]

## Truth for this track

| Layer | Role |
|-------|------|
| `idea/Jord/` | R&D and naming record (**complete**) |
| **`feature_list/Jord/`** | **Valid intent** (Slice 0 + Studio vision) |
| `plan/Jord/` | S0001–**S0016** **closed** · next S0017 · backlog [[../../plan/Jord/00-remaining-backlog]] |
| `tech_space/jord/` | [[../../tech_space/jord/00-s0001-slice0]] … [[../../tech_space/jord/15-s0016-schema-drop-rename]] |
| Code targets | `data/jord.db` · `data/blobs/` · `elements/jord` · `cloud/jord` · `apps/jord-studio` |

## Features

| Note | Status |
|------|--------|
| [[00-intent]] | Slice 0 — **shipped** |
| [[01-later]] | Engine + pillars + Studio order (vectors **shipped**) |
| [[02-architecture]] | `JordDriverPort`, adapters, concurrency, dialect seams (`searchVectors`) |
| [[03-jord-studio]] | Studio S1–S11 done · schema DDL [[../../tech_space/jord/15-s0016-schema-drop-rename]] |

## Gate

1. ~~Apolyx-S0005~~ — **closed** 2026-10-21.
2. ~~Jord-S0001–S0016~~ — **closed** 2026-10-24.
3. **Next:** Jord-S0017 (Postgres RLS). Numbered queue ends at **Jord-S0020**.
4. Apps stay Apolyx-first (`.cursor/rules/apolyx-first.mdc`).
