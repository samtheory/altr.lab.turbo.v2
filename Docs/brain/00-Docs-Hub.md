---
title: "Docs Hub — folder index"
description: "Canonical index of every Docs/ folder in the altr.lab vault"
created: 2026-09-19
updated: 2026-10-18
tags:
  - brain
  - hub
  - index
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

**Idea catalog (2026-10-18, v2.1):** [[../idea/artemis/README|Artemis]] · [[../idea/Apolyx (ui-kit)/README|Apolyx]] · [[../idea/Jord/README|Jord]] · [[../idea/hyperfit/README|HyperFit]] · [[../idea/co-op-sphere/README|Co-Op Sphere]] · [[../idea/pantry-yield/README|PantryYield]] · [[../idea/forge-realm/README|ForgeRealm]]. Promoted: Apolyx (built) and Jord (intent [[../feature_list/Jord/00-intent]], architecture [[../feature_list/Jord/02-architecture]], Studio [[../feature_list/Jord/03-jord-studio]], plan [[../plan/Jord/Jord-S0001/README]] ready to implement).

**Apolyx** (promoted): idea [[../idea/Apolyx (ui-kit)/README]] · [[../feature_list/ui-kit/README]] · [[../plan/ui-kit/README]] (**Apolyx-S0001**–**Apolyx-S0004** closed) · [[../tech_space/ui-kit/README]] (latest [[../tech_space/ui-kit/09-s0004-popover]]). The idea folder is named `Apolyx (ui-kit)`. Intent, plan, and as-built stay under `ui-kit`.

## Agent of record

| Agent | Owns | Triggers |
|-------|------|----------|
| **docs_man** | Docs vault | `update_docs`, `document it` |
| **apollo** | Apolyx UI kit implementation | `apollo`, `build apolyx` |
