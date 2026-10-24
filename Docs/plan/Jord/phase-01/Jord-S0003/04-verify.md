---
title: "Phase 4 — verify Jord-S0003"
description: "Acceptance commands, then docs_man as-built note"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - jord
  - Jord-S0003
---

# Phase 4 — verify Jord-S0003

> Who: implementer for commands. **docs_man** for vault after code lands.

Sprint index: [[README]]

## Status

**done** (2026-10-21)

## Commands

- [x] `pnpm --filter @altr/jord-studio typecheck`
- [x] `pnpm --filter @altr/apolyx typecheck` (only if kit changed for a missing control) — kit unchanged
- [x] Manual: side nav categories visible; Insert row column form creates a row; edit + stale 409 still work
- [x] Confirm no `@libsql/client` / `jord.db` path usage under `apps/jord-studio`

## After the code lands

docs_man:

1. [[../../../../tech_space/jord/studio]]
2. Tick S0003 acceptance; refresh [[../../../../feature_list/Jord/03-jord-studio]]
3. Refresh [[../../../../report/STATUS]] and [[../../../../brain/00-Docs-Brain]]

## Done when

Plan DoD is checked. Schema visualizer / auth remain unbuilt.
