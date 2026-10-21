---
title: "sindri — Jord engine smith"
description: "Mimir specialist: forge @altr/jord and @altr/jord-server packages, LibSqlAdapter, pragmas, snapshot, write queue"
created: 2026-10-21
updated: 2026-10-21
tags:
  - agents
  - mimir
  - sindri
  - jord
---

# sindri

> Named after **Sindri**, the dwarf-smith who forged Mjolnir. Under **mimir**, Sindri forges the Jord **engine and server** metalwork.

Parent: [[../00-index]] · Workflow: [[../instructions/00-workflow]]

## Triggers

`mimir:sindri` · packages / driver / snapshot / server wiring cards

## Owns

- `elements/jord` scaffolding (`@altr/jord`)
- `cloud/jord` scaffolding (`@altr/jord-server`)
- `JordDriverPort` + `LibSqlAdapter` implementation
- WAL / busy_timeout / synchronous pragmas on open
- `mkdir` for `data/` before open
- `pnpm db:snapshot`
- Hono app bootstrap, serial write queue, checkpoint timer + SIGINT/SIGTERM
- Card 7: stop `@altr/base` from being a live Turso client
- May add `@altr/base` as a **dependency of** jord/jord-server for shared utils; **never** the reverse ([[../../../feature_list/00-elements-dependency-rules]])

## Does not own

- Schema column design details → **saga**
- Security review / Strix → **heimdall**
- Studio UI → **apollo**

## Skills (typical)

`nodejs-backend-patterns` · `hono-typescript` · `graft` · `find-docs` / Context7 for `@libsql/client`

## Read first

[[../../../feature_list/Jord/00-intent]] · [[../../../plan/Jord/Jord-S0001/01-packages]] · [[../../../plan/Jord/Jord-S0001/02-driver]] · [[../../../plan/Jord/Jord-S0001/06-server]]
