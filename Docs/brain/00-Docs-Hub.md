---
title: "Docs Hub — folder index"
description: "Canonical index of every Docs/ folder in the altr.lab vault"
created: 2026-09-19
updated: 2026-10-24
tags:
  - brain
  - hub
  - index
  - Jord-S0009
  - Jord-S0010
  - Jord-S0012
  - Jord-S0013
---

# Docs Hub

Canonical explanation of every top-level folder under `Docs/`. Start at [[00-Docs-Brain]] for the living map and graphs.

| Folder | Purpose | Entry |
|--------|---------|-------|
| `brain/` | Living map + hub (open first) | [[00-Docs-Brain]] · this file |
| `Altr.lab/` | Root turbo project docs (structure, commands, stack, prompts, agent skills, Graft) | [[../Altr.lab/README]] · [[../Altr.lab/agent-skills]] · [[../Altr.lab/graft]] |
| `idea/` | Raw R&D ideas before promotion | [[../idea/README]] · catalog [[../idea/2026-10-18-product-catalog]] |
| `feature_list/` | Raw feature instructions to implement | [[../feature_list/README]] |
| `plan/` | Next-step plans from feature_list + tech_space | [[../plan/README]] |
| `tech_space/` | As-built technical implementation docs | [[../tech_space/README]] |
| `report/` | Implemented / remaining / planned sum-up | [[../report/README]] · [[../report/STATUS]] |
| `clickup/` | ClickUp task / project management notes | [[../clickup/README]] |
| `agents/` | AI sub-agents, skills, prompts | [[../agents/README]] · [[../agents/docs_man/00-index]] · [[../agents/apollo/00-index]] |

## Promotion path

`idea` → `feature_list` → `plan` (+ `clickup`) → **code** → `tech_space` → `report` → refresh [[00-Docs-Brain]]

App-scoped tracks use matching subfolders: `idea/<app>/` → `feature_list/<app>/` → `plan/<app>/` (sprint only) → `tech_space/<app>/`.

**Idea catalog (v2.3):** [[../idea/artemis/README|Artemis]] · [[../idea/Apolyx (ui-kit)/README|Apolyx]] · [[../idea/Jord/README|Jord]] · [[../idea/hyperfit/README|HyperFit]] · [[../idea/co-op-sphere/README|Co-Op Sphere]] · [[../idea/pantry-yield/README|PantryYield]] · [[../idea/forge-realm/README|ForgeRealm]] · [[../idea/api-client/README|API client]] · [[../idea/search/README|Search]] · [[../idea/Tia (Map Engine)/README|Tia]]. Promoted: Apolyx (S0001–**S0005** shipped); Jord (**S0001**–**S0013** shipped); **Tia** (intent only). Artemis still idea-only. Sequence: [[../plan/00-roadmap-apolyx-jord-artemis]].

**Apolyx** (promoted): idea [[../idea/Apolyx (ui-kit)/README]] · [[../feature_list/ui-kit/README]] · [[../plan/ui-kit/README]] (**S0001**–**S0005** closed) · [[../tech_space/ui-kit/README]] (latest [[../tech_space/ui-kit/10-s0005-product-gate]]).

**Jord** (Slice 0 + Studio through S0013 blobs done): intent [[../feature_list/Jord/00-intent]] · engine [[../tech_space/jord/00-s0001-slice0]] · latest [[../tech_space/jord/12-s0013-blobs]] · track [[../plan/Jord/README]] · Studio intent [[../feature_list/Jord/03-jord-studio]].

## Agent of record

| Agent | Owns | Triggers |
|-------|------|----------|
| **docs_man** | Docs vault | `update_docs`, `document it` |
| **apollo** | Apolyx UI kit implementation | `apollo`, `build apolyx` |
| **mimir** | Jord **program master** (engine + Studio orchestration + docs); hats: sindri / saga / heimdall / apollo / docs_man | `mimir`, `build jord`, `mimir … with apollo` |
