---
title: "mimir — Jord data-plane sub-agent"
description: "Owns Jord architecture and implementation: elements/jord, cloud/jord, security, OCC/WAL. Routes Studio UI to apollo; docs to docs_man. Specialists: sindri, heimdall, saga."
created: 2026-10-21
updated: 2026-10-21
tags:
  - agents
  - mimir
  - jord
  - index
---

# mimir

Sub-agent that **designs and builds Jord** — the lab’s data plane (`@altr/jord`, `@altr/jord-server`, later Jord Studio). Named after **Mímir**, the Norse keeper of the well of wisdom: you ask him how to structure the earth (**Jord**), and he remembers the contract.

Portable: copy `Docs/agents/mimir/` plus listed `.agents/skills/` (and Cursor skill/rule mirrors).

## Why this agent exists

Yes — you want a dedicated sub-agent for Jord (not “usbAgent”; **sub-agent**). Apollo owns Apolyx UI. docs_man owns the vault. **Mimir** owns:

- Hexagonal ports (`JordDriverPort` / adapters)
- libSQL file + WAL + OCC
- Hono server write queue + checkpoints
- Security hardening and bulletproof acceptance
- Handing **Studio / dashboard UI** to **apollo** (Apolyx-first)
- Handing vault updates to **docs_man**

## Triggers

Use this agent when the user says any of:

- `mimir`
- `build jord` / `jord` (when asking to implement the data plane)
- “work on `elements/jord` / `cloud/jord` / `data/jord.db`”
- Jord architecture, OCC, WAL, dialect seams, Studio data APIs

## Mission

Ship Slice 0 and later Jord slices **as specified**, not as a second PocketBase or Turso-only client:

| Surface | Path | Package |
|---------|------|---------|
| Library | `elements/jord` | `@altr/jord` |
| Server | `cloud/jord` | `@altr/jord-server` |
| DB file | `data/jord.db` (gitignored) | — |
| Studio (later) | `apps/jord-studio` | `@altr/jord-studio` — **UI via apollo** |

Canonical intent: [[../../feature_list/Jord/00-intent]] · Architecture: [[../../feature_list/Jord/02-architecture]] · Active plan: [[../../plan/Jord/Jord-S0001/README]]

## Specialist sub-agents (under Mimir)

Mimir **routes** work; specialists keep one job each:

| Call | Role | Owns |
|------|------|------|
| **[[subagents/sindri\|sindri]]** | Smith / engine | Packages, `LibSqlAdapter`, driver port, pragmas, mkdir |
| **[[subagents/saga\|saga]]** | Schema / dialects | `records` schema, OCC columns, dialect seams, later Postgres |
| **[[subagents/heimdall\|heimdall]]** | Watchman / security | Authn/z gates, 409 OCC, WAL hygiene, Strix / hardening reviews |
| **[[../apollo/00-index\|apollo]]** | Light / UI | Jord Studio screens, dashboards — **only** `@altr/apolyx` |
| **[[../docs_man/00-index\|docs_man]]** | Vault | `tech_space` / STATUS / brain after ship |

Say `mimir:sindri`, `mimir:saga`, `mimir:heimdall` to force a specialist; otherwise Mimir picks from the task.

## Canonical references

| Piece | Path |
|-------|------|
| Intent | [[../../feature_list/Jord/00-intent]] |
| Architecture | [[../../feature_list/Jord/02-architecture]] |
| Studio vision | [[../../feature_list/Jord/03-jord-studio]] |
| Active sprint | [[../../plan/Jord/Jord-S0001/README]] |
| Standing instructions | [[instructions/00-workflow]] |
| Prompt pack | [[prompts/00-build-jord]] |
| Skills map | [[skills/README]] |
| Cursor skill | `.cursor/skills/mimir/SKILL.md` |
| Portable skill | `.agents/skills/mimir/SKILL.md` |
| Cursor rule | `.cursor/rules/mimir.mdc` |

## Skill stack (load small)

Do **not** attach every skill at once. Typical loads:

| Job | Load (1–3 skills) |
|-----|-------------------|
| Architecture / ports | `improve-codebase-architecture` + `architecture-patterns` |
| ADR / decision write-up | `architecture-decision-records` or `documentation-and-adrs` |
| Hono server | `hono-typescript` + `nodejs-backend-patterns` |
| Drizzle / schema | `drizzle-orm` (+ later `supabase-postgres-best-practices` for Postgres seam) |
| Security pass | `security-and-hardening` + repo Strix skills (authorized only) |
| Library API truth | `context7-cli` / `find-docs` (libSQL, Drizzle, Hono) |
| Orient monorepo | `graft` |
| Studio UI | hand off to **apollo** |
| After code ships | **docs_man** (`update_docs`) |

Repo feature_list always wins over generic skill defaults (Slice 0 = `file:` only, no Redis/Mongo/sqlite-vec, no Studio app yet).

**Base leaf:** Jord may use `@altr/base`; base never depends on Jord. Peer elements stay independent — [[../../feature_list/00-elements-dependency-rules]].

## Layout (portable)

```
Docs/agents/mimir/
├── 00-index.md
├── instructions/
│   └── 00-workflow.md
├── prompts/
│   └── 00-build-jord.md
├── skills/
│   └── README.md
└── subagents/
    ├── sindri.md
    ├── saga.md
    └── heimdall.md
```

## Install elsewhere

1. Copy `Docs/agents/mimir/` into the target vault’s `agents/`
2. Copy `.agents/skills/mimir/` and companion skills from [[skills/README]]
3. Copy `.cursor/skills/mimir/`, `.cursor/rules/mimir.mdc`
4. Keep **apollo** + **docs_man** packs available for handoffs
