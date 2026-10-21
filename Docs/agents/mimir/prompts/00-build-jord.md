---
title: "Prompt — mimir / build Jord"
description: "Copy-paste prompts: mimir as Jord program master, with apollo / docs_man hats"
created: 2026-10-21
updated: 2026-10-21
tags:
  - agents
  - mimir
  - jord
  - prompts
---

# Prompts — mimir

## Short trigger (master)

```
mimir
```

```
build jord
```

## What you want (orchestrator)

```
mimir: build the active Jord plan end-to-end.
You are program master — design, engine, Studio, docs.
Call sindri / saga / heimdall / apollo / docs_man as the cards require.
Do not invent Apolyx primitives in apps/jord-studio.
```

```
mimir: execute Docs/plan/Jord/Jord-S0002 with help of apollo.
Stay mimir as conductor; for UI cards act as mimir → apollo (Apolyx-first).
Start at the first phase not marked done. After verify → docs_man.
```

## Full handoff

```
Act as mimir (Docs/agents/mimir) — Jord program master.
Read Docs/agents/mimir/instructions/00-workflow.md and the active sprint under Docs/plan/Jord/.
Own the outcome. Route: sindri (engine), saga (schema), heimdall (security),
apollo (Studio UI / kit gaps), docs_man (vault after ship).
Hard rules from feature_list + active cards. Load at most 2–3 skills per turn.
```

## Specialist shortcuts

```
mimir:sindri — packages / LibSqlAdapter / pragmas / snapshot / server queue
```

```
mimir:saga — records schema / OCC SQL / dialect seams
```

```
mimir:heimdall — security / 409 / WAL / Strix (authorized)
```

```
mimir:apollo — Studio UI (load apollo workflow; Apolyx-first)
```

```
mimir:docs_man — update_docs after green verify
```

## Direct apollo (optional)

Only if you want UI without mimir conducting:

```
apollo: execute Docs/plan/Jord/Jord-S0002 — start at first undone card.
```
