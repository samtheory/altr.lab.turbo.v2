---
title: "Phase 6 — verify Jord-S0002"
description: "Acceptance commands, then docs_man as-built note"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - jord
  - Jord-S0002
---

# Phase 6 — verify Jord-S0002

> Who: implementer for commands. **docs_man** for vault after code is in the tree.

Sprint index: [[README]] · S1 acceptance: [[../../../../feature_list/Jord/03-jord-studio]]

## Status

**done** (2026-10-21)

## Commands

- [x] `pnpm --filter @altr/jord-studio typecheck`
- [x] `pnpm --filter @altr/apolyx typecheck` (unchanged kit; no accidental kit edits unless a missing control was built first)
- [x] Manual: `dev:jord` + `dev:jord-studio` — list bucket, create, patch, stale 409
- [x] Confirm no `@libsql/client` / `jord.db` path usage under `apps/jord-studio`

## After the code lands

docs_man:

1. [[../../../../tech_space/jord/studio]] — Studio S1 wiring (proxy, env, Apolyx pages)
2. Tick S1 acceptance on [[../../../../feature_list/Jord/03-jord-studio]]
3. Refresh [[../../../../report/STATUS]] and [[../../../../brain/00-Docs-Brain]]

## Done when

S1 acceptance is checked against those results. Schema visualizer and auth remain unbuilt.
