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

Sprint index: [[README]] · S2 intent: [[../../../feature_list/Jord/03-jord-studio]]

## Commands

- [ ] `pnpm --filter @altr/jord test` + `typecheck`
- [ ] `pnpm --filter @altr/jord-server test` + `typecheck`
- [ ] `pnpm --filter @altr/jord-studio typecheck`
- [ ] Manual: Schema nav live → see `records` → ADD COLUMN → column visible
- [ ] Confirm Studio still has no `@libsql/client` / `jord.db` path usage

## After the code lands

docs_man:

1. `Docs/tech_space/jord/` note for S0004 (introspect, routes, Studio schema UX)
2. Tick S2 progress on [[../../../feature_list/Jord/03-jord-studio]]
3. Refresh [[../../../report/STATUS]] and [[../../../brain/00-Docs-Brain]]

## Done when

S2 foundation acceptance matches code. Full migration history / CREATE TABLE UI remain later sprints.
