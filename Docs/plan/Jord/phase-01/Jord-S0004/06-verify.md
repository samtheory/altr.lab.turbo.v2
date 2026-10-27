---
title: "Phase 6 — verify Jord-S0004"
description: "Acceptance commands, then docs_man as-built note"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - jord
  - Jord-S0004
---

# Phase 6 — verify Jord-S0004

> Who: implementer for commands. **docs_man** for vault after code lands.

Sprint index: [[README]] · S2 intent: [[../../../../feature_list/Jord/done/jord-F0012-studio]]

## Status

**done** (2026-10-21)

## Commands

- [x] `pnpm --filter @altr/jord test` + `typecheck`
- [x] `pnpm --filter @altr/jord-server test` + `typecheck`
- [x] `pnpm --filter @altr/jord-studio typecheck`
- [x] Manual: Schema nav live → see `records` → ADD COLUMN → column visible
- [x] Confirm Studio still has no `@libsql/client` / `jord.db` path usage

## After the code lands

docs_man:

1. [[../../../../tech_space/jord/schema]]
2. Tick S2 progress on [[../../../../feature_list/Jord/done/jord-F0012-studio]]
3. Refresh [[../../../../report/STATUS]] and [[../../../../brain/00-Docs-Brain]]

## Done when

S2 foundation acceptance matches code. Full migration history / CREATE TABLE UI remain later sprints.
