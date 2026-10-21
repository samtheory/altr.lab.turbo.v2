---
title: "Prompt — mimir / build Jord"
description: "Copy-paste prompts that invoke the mimir sub-agent and specialists"
created: 2026-10-21
updated: 2026-10-21
tags:
  - agents
  - mimir
  - jord
  - prompts
---

# Prompts — mimir

## Short trigger

```
mimir
```

```
build jord
```

## Full handoff

```
Act as mimir (Docs/agents/mimir).
Read Docs/feature_list/Jord/00-intent.md, Docs/feature_list/Jord/02-architecture.md,
and Docs/agents/mimir/instructions/00-workflow.md.
Implement Jord per Docs/plan/Jord/Jord-S0001 (start at first undone card).
Hard rules: file: only; WAL + OCC version; one write queue in @altr/jord-server;
no Redis/Mongo/sqlite-vec/Studio app in S0001.
Route engine → sindri, schema → saga, security → heimdall.
Studio UI later → apollo (@altr/apolyx only). After verify → docs_man.
Load at most 2–3 skills for this task.
```

## Execute the sprint

```
mimir: execute Docs/plan/Jord/Jord-S0001 — start at the first phase not marked done.
Read the sprint README and that phase card. Tick Done when. Summarize files touched.
```

## Specialist shortcuts

```
mimir:sindri — packages / LibSqlAdapter / pragmas / snapshot
```

```
mimir:saga — records schema / OCC SQL / dialect seams
```

```
mimir:heimdall — security review / 409 / WAL / Strix (authorized)
```

```
apollo — Jord Studio UI / dashboard (Apolyx-first); mimir owns the data APIs
```
