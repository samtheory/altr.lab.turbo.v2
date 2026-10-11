---
title: "Docs Hub — folder index"
description: "Canonical index of every Docs/ folder in the altr.lab vault"
created: 2026-09-19
updated: 2026-10-11
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
| `idea/` | Raw R&D ideas before promotion | [[../idea/README]] |
| `feature_list/` | Raw feature instructions to implement | [[../feature_list/README]] |
| `plan/` | Next-step plans from feature_list + tech_space | [[../plan/README]] |
| `tech_space/` | As-built technical implementation docs | [[../tech_space/README]] |
| `report/` | Implemented / remaining / planned sum-up | [[../report/README]] · [[../report/STATUS]] |
| `clickup/` | ClickUp task / project management notes | [[../clickup/README]] |
| `agents/` | AI sub-agents, skills, prompts | [[../agents/README]] · [[../agents/docs_man/00-index]] · [[../agents/apollo/00-index]] |

## Promotion path

`idea` → `feature_list` → `plan` (+ `clickup`) → **code** → `tech_space` → `report` → refresh [[00-Docs-Brain]]

App-scoped tracks use matching subfolders: `idea/<app>/` → `feature_list/<app>/` → `plan/<app>/` (sprint only) → `tech_space/<app>/`. Example: **Apolyx** UI kit — [[../idea/ui-kit/README]] · [[../feature_list/ui-kit/README]] · [[../plan/ui-kit/README]] (active sprint).

## Agent of record

| Agent | Owns | Triggers |
|-------|------|----------|
| **docs_man** | Docs vault | `update_docs`, `document it` |
| **apollo** | Apolyx UI kit implementation | `apollo`, `build apolyx` |
