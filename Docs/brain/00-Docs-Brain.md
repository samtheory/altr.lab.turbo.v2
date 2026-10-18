---
title: "Docs Brain — living map"
description: "Cross-cutting graph of the altr.lab vault, product loop, and doc types for humans and agents"
created: 2026-09-19
updated: 2026-10-18
tags:
  - brain
  - index
  - mermaid
  - altr-lab
---

# Docs Brain — living map

> Open this file first. It is the shared map for people in Obsidian and agents in Cursor.

**Agents:** [[../agents/docs_man/00-index|docs_man]] · [[../agents/apollo/00-index|apollo]] · **Folder hub:** [[00-Docs-Hub]]

**Triggers:** `update_docs` / `document it` → **docs_man**. `apollo` / `build apolyx` → **apollo** (Apolyx UI kit).

---

## How to read this vault

| You want | Go here |
|----------|---------|
| Every docs folder explained | [[00-Docs-Hub]] |
| Monorepo structure / commands / stack | [[../Altr.lab/README]] · [[../Altr.lab/structure]] · [[../Altr.lab/commands]] · [[../Altr.lab/stack]] |
| Agent skills / Graft | [[../Altr.lab/agent-skills]] · [[../Altr.lab/graft]] |
| Raw R&D ideas | [[../idea/README]] · catalog [[../idea/2026-10-18-product-catalog]] |
| Product intent (what to build) | [[../feature_list/README]] |
| Build plans (next steps) | [[../plan/README]] |
| Complete vs remaining | [[../report/README]] · [[../report/STATUS]] |
| As-built notes (how it was coded) | [[../tech_space/README]] |
| ClickUp / task cards | [[../clickup/README]] |
| AI sub-agents | [[../agents/README]] · [[../agents/docs_man/00-index]] · [[../agents/apollo/00-index]] |
| AI run prompts for the repo | [[../Altr.lab/prompts]] |

```mermaid
flowchart LR
  subgraph ingest [Ingest]
    ID[idea]
  end
  subgraph spec [Spec]
    FL[feature_list]
    AL[Altr.lab]
  end
  subgraph status [Status]
    PL[plan]
    RP[report]
  end
  subgraph built [As-built]
    TS[tech_space]
  end
  subgraph action [Action]
    CU[clickup]
    AG[agents]
  end
  ID --> FL
  AL --> FL
  FL --> PL
  TS --> PL
  PL --> RP
  TS --> RP
  FL --> RP
  RP -.->|gaps| CU
  PL --> CU
  AG --> TS
  PL -->|implement| CODE[apps / cloud / elements]
  CODE --> TS
```

Truth order when they disagree: **code** (`apps/`, `cloud/`, `elements/`) > **tech_space** > **report/plan** > **feature_list**. Spec still wins for “what we intend to build.”

---

## Product / work loop

```mermaid
flowchart TD
  idea[idea R and D] --> feature_list
  feature_list --> plan
  plan --> clickup
  plan --> implement[implement in monorepo]
  implement --> tech_space
  tech_space --> report
  report -->|gaps| feature_list
  report -->|next pickup| plan
  agents[docs_man + other agents] -.-> feature_list
  agents -.-> plan
  agents -.-> tech_space
  agents -.-> report
```

Deep dives: [[../Altr.lab/stack]] · [[../idea/README]] · [[../report/STATUS]]

---

## Repo surfaces the docs describe

| Surface | Path | Docs |
|---------|------|------|
| Landing hub | `apps/hub` | [[../tech_space/01-hub-ui-kit-base]] · [[../feature_list/01-hub-ui-kit-base]] |
| Extra Next scaffold | `apps/web` | Altr.lab/structure |
| Admin dashboard | `apps/dashboard` | Altr.lab + future tech_space |
| Trading UI | `apps/trading-ui` | Altr.lab + future tech_space |
| Hono API | `cloud/hono-server` | Altr.lab/stack · tech_space |
| PocketBase (optional) | `cloud/pocketbase` | Altr.lab/stack |
| AI bot agent | `cloud/ai-bot-agent` | Altr.lab · agents |
| Design system (**Apolyx**) | `elements/ui-kit` (`@altr/apolyx`) · `apps/apolyx` · `elements/apolyx-cli` | Intent: [[../feature_list/ui-kit/00-intent]] · Wave 2: [[../feature_list/ui-kit/02-apolyx-s0002-wave]] · Wave 3: [[../feature_list/ui-kit/04-apolyx-s0003-switch-inputs]] · Sprints **Apolyx-S0001**, **Apolyx-S0002**, **Apolyx-S0003** (closed): [[../plan/ui-kit/README]] · As-built: [[../tech_space/ui-kit/README]] · Builder: [[../agents/apollo/00-index]] · Idea: [[../idea/Apolyx (ui-kit)/README]] · Historical v0: [[../tech_space/01-hub-ui-kit-base]] · [[../tech_space/02-ui-kit-storybook]] |
| Shared libs | `elements/base` | [[../tech_space/01-hub-ui-kit-base]] · base README |

Primary DB decision: **Turso / libSQL** (see [[../Altr.lab/stack]]). PocketBase for quick admin/auth side projects. Postgres only when a project needs it.

---

## Status snapshot

| Layer | Role | Freshness |
|-------|------|-----------|
| `idea/` | Raw R&D before promotion | Catalog: [[../idea/2026-10-18-product-catalog]] (Artemis, Apolyx, AltrBase, HyperFit, Co-Op Sphere, PantryYield, ForgeRealm). Apolyx track: [[../idea/Apolyx (ui-kit)/README]] |
| `feature_list/` | Intent / what to build | App tracks: [[../feature_list/ui-kit/README]] · Latest shipped: [[../feature_list/ui-kit/04-apolyx-s0003-switch-inputs]] (S0003, acceptance ticked) · Earlier: [[../feature_list/ui-kit/03-timeline]] · [[../feature_list/ui-kit/02-apolyx-s0002-wave]] (kit intent: [[../feature_list/ui-kit/00-intent]]) · Next seeds: [[../feature_list/ui-kit/01-apolyx-s0001-carryovers]] |
| `plan/` | Checkbox overlay + next steps | No active sprint · Closed: [[../plan/ui-kit/README]] (**Apolyx-S0001**, **Apolyx-S0002**, **Apolyx-S0003** — [[../plan/ui-kit/Apolyx-S0003/README]], closed 2026-10-14) |
| `report/` | Audited complete vs remaining | Latest: [[../report/STATUS]] (2026-10-14, after Apolyx-S0003: 66 registry items, 141 tests, 48 MDX pages) |
| `tech_space/` | Implementation narrative | Latest: [[../tech_space/ui-kit/08-s0003-switch-inputs]] (Apolyx-S0003 + borderless focus / checkbox motion polish) · [[../tech_space/ui-kit/05-docs-app]] (Forms group, category convention) · [[../tech_space/ui-kit/07-timeline]] · index [[../tech_space/ui-kit/README]] |
| `clickup/` | External task sync notes | Edit when extracting work |
| `agents/` | Sub-agent defs (docs_man, …) | Edit when agent behaviour changes |
| `Altr.lab/` | Root turbo how-tos | Edit when structure/commands change |
| `brain/` | This living map | Update when folders or truth order change |

**Latest durable audit:** [[../report/STATUS]].

---

## Companion skills

How-to: [[../Altr.lab/agent-skills]] · Graft: [[../Altr.lab/graft]] · MCP: `.cursor/mcp.json`

| Skill | Location | Use |
|-------|----------|-----|
| `docs-man` | `.agents/skills/docs-man/` · `.cursor/skills/docs-man/` | Vault update order, frontmatter, wikilinks |
| `apollo` | `.agents/skills/apollo/` · `.cursor/skills/apollo/` · [[../agents/apollo/00-index]] | Build Apolyx UI kit |
| `docs-brain` | `.cursor/skills/docs-brain/` | Keep this living map honest |
| `pdf` | `.agents/skills/pdf/` | Read/create/merge PDFs |
| `doc-coauthoring` | `.agents/skills/doc-coauthoring/` | Large new specs with guided loop |
| `graft` | `.agents/skills/graft/` | Codebase graph before blind grep |
| `design-taste-frontend` | `.agents/skills/design-taste-frontend/` | Anti-slop frontend taste |
| `impeccable` | `.agents/skills/impeccable/` | Critique / polish / design commands |
| `playwright-cli` | `.agents/skills/playwright-cli/` | Browser automation via Playwright CLI |
| `context7-*` / `find-docs` | `.agents/skills/` | Up-to-date library docs |
| `ui-skills-*` / `baseline-ui` | `.agents/skills/` | UI routing + polish / a11y |
| `img2threejs` | `.agents/skills/img2threejs/` | Image → procedural Three.js |
| Strix pack | `.agents/skills/*strix*` / security skills | Authorized AppSec only |
| awesome-design aesthetics | `.agents/skills/<aesthetic>/` | One named visual language |
| `find-skills` | user skills | Find and install more from skills.sh |

Project installs: `npx skills list` · lockfile: `skills-lock.json`.

Vendored copies live under `.agents/skills/` so the repo stays portable without a global install.

---

## Maintainers

When you add a durable doc:

1. Use the frontmatter template in [[../agents/templates/structured-note]]
2. Add a wikilink on [[00-Docs-Hub]] and here
3. Keep graphs honest
4. Prefer updating existing files over inventing parallel trees
5. Route doc work through **docs_man** (`update_docs` / `document it`)
