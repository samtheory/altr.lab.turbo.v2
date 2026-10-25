---
title: "Docs Brain — living map"
description: "Cross-cutting graph of the altr.lab vault, product loop, and doc types for humans and agents"
created: 2026-09-19
updated: 2026-10-25
tags:
  - brain
  - index
  - mermaid
  - altr-lab
  - Jord-S0001
  - Jord-S0002
  - Jord-S0003
  - Jord-S0004
  - Jord-S0005
  - Jord-S0006
  - Jord-S0007
  - Jord-S0009
  - Jord-S0010
  - Jord-S0011
  - Jord-S0012
  - Jord-S0013
  - Jord-S0014
---

# Docs Brain — living map

> Open this file first. It is the shared map for people in Obsidian and agents in Cursor.

**Agents:** [[../agents/docs_man/00-index|docs_man]] · [[../agents/apollo/00-index|apollo]] · [[../agents/mimir/00-index|mimir]] · **Folder hub:** [[00-Docs-Hub]]

**Triggers:** `update_docs` / `document it` → **docs_man**. `apollo` / `build apolyx` → **apollo** (Apolyx UI kit). `mimir` / `build jord` → **mimir** (Jord **program master**: sindri / saga / heimdall; Studio → apollo; vault → docs_man).

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
| Apolyx docs app | `apps/apolyx` | [[../tech_space/ui-kit/05-docs-app]] |
| PocketBase (optional) | `cloud/pocketbase` | Altr.lab/stack |
| Removed 2026-10-18 | `apps/hub`, `apps/web`, `apps/dashboard`, `apps/trading-ui`, `cloud/hono-server`, `cloud/ai-bot-agent` | [[../tech_space/03-sample-apps-removed]] |
| Design system (**Apolyx**) | `elements/ui-kit` (`@altr/apolyx`) · `apps/apolyx` · `elements/apolyx-cli` | Intent: [[../feature_list/ui-kit/00-intent]] · S0005 closed: [[../feature_list/ui-kit/06-apolyx-s0005-product-gate]] · As-built [[../tech_space/ui-kit/10-s0005-product-gate]] · Sprints [[../plan/ui-kit/README]] · Apolyx-first: `.cursor/rules/apolyx-first.mdc` · Builder: [[../agents/apollo/00-index]] |
| Data plane (**Jord**) | `elements/jord` · `cloud/jord` · `apps/jord-studio` · `data/jord.db` · `data/blobs/` (gitignored) | Manual: [[../tech_space/jord/README]] · Intent: [[../feature_list/Jord/README]] · Plans [[../plan/Jord/README]] · Review [[../report/Jord-implemented-review]] · Builder: [[../agents/mimir/00-index]] |
| Shared libs | `elements/base` (`@altr/base` **leaf**) | Rules: [[../feature_list/00-elements-dependency-rules]] · base README · historical [[../tech_space/01-hub-ui-kit-base]] |

**Lab sequence:** [[../plan/00-roadmap-apolyx-jord-artemis]] — Apolyx-S0005 (**done**) → Jord **phase-01** S0001–**S0020** (**done**) → Jord **phase-02**: **S0027** CI workflow in tree ([[../tech_space/jord/overview/README#ci]]; Actions / branch-protection still UNVERIFIED) → **S0021-A** migration runner in tree ([[../tech_space/jord/overview/README#boot-migrations]]; Postgres lock tests not run here) → **S0021-B** principals in tree ([[../tech_space/jord/auth/README]]; Postgres identity tests not run here) → **S0021 ADR accepted** → **S0021-C** policies in tree for file libSQL ([[../tech_space/jord/policies/README]]; Postgres pool-leak and dialect-pair not run) → **S0028** HTTP hardening in tree ([[../tech_space/jord/overview/README#http-edge-s0028]]) → next untouched stop **S0022**.

Primary DB: **Jord** — libSQL / Turso / Postgres + Studio control plane through phase-01. Intent [[../feature_list/Jord/README]] · Phase-02 features [[../feature_list/Jord/03-phase-02-features]] · Plans [[../plan/Jord/README]]. PocketBase stays optional.

---

## Status snapshot

| Layer | Role | Freshness |
|-------|------|-----------|
| `idea/` | Raw R&D before promotion | Catalog v2.3: [[../idea/2026-10-18-product-catalog]]. Apolyx · Jord · API client · Search · **Tia** ([[../idea/Tia (Map Engine)/README]], promoted). Sharpen: [[../idea/Tia (Map Engine)/2026-10-19-sharpen]] |
| `feature_list/` | Intent / what to build | [[../feature_list/ui-kit/README]] · **Jord:** [[../feature_list/Jord/README]] · capabilities [[../feature_list/Jord/04-phase-01-capabilities]] · phase-02 features [[../feature_list/Jord/03-phase-02-features]] · soft [[../feature_list/Jord/01-phase-02-candidates]] · **Tia:** [[../feature_list/tia/README]] |
| `plan/` | Checkbox overlay + next steps | Jord: [[../plan/Jord/README]] · [[../plan/Jord/phase-01/README\|phase-01]] · [[../plan/Jord/phase-02/README\|phase-02]] (S0021–S0027) · Roadmap: [[../plan/00-roadmap-apolyx-jord-artemis]] |
| `report/` | Audited complete vs remaining | [[../report/STATUS]] · **Shipped review:** [[../report/Jord-implemented-review]] · **Handoff:** [[../report/Jord-technical-brief]] · **Phase-02 plan review:** [[../report/Jord-phase-02-plan-review]] · **Phase-02 prompt:** [[../report/Jord-next-phase2-prompt]] |
| `tech_space/` | Living system manuals by category | Jord: [[../tech_space/jord/README]] · Apolyx: [[../tech_space/ui-kit/10-s0005-product-gate]] · index [[../tech_space/README]] |
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
| `mimir` | `.agents/skills/mimir/` · `.cursor/skills/mimir/` · [[../agents/mimir/00-index]] | Build Jord data plane (sindri / saga / heimdall) |
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
