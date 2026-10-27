---
title: "Phase 5 — verify Jord-S0005"
description: "Acceptance commands, then docs_man as-built note"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - jord
  - Jord-S0005
---

# Phase 5 — verify Jord-S0005

> Who: implementer for commands. **docs_man** for vault after code lands.

Sprint index: [[README]] · S3 intent: [[../../../../feature_list/Jord/done/jord-F0012-studio]]

## Status

**done** (2026-10-21)

## Commands

- [ ] `pnpm --filter @altr/jord-server test` + `typecheck`
- [ ] `pnpm --filter @altr/jord test` + `typecheck` (if types touched)
- [ ] `pnpm --filter @altr/jord-studio typecheck`
- [ ] Manual: signed-out → login → browse records
- [ ] Manual: `readonly` blocked on insert / schema alter; `admin` allowed
- [ ] Confirm Studio still has no `@libsql/client` / `jord.db` path usage
- [ ] Confirm unauthenticated direct hit to jord-server protected route → 401

## After the code lands

docs_man:

1. Write [[../../../../tech_space/jord/auth]] (as-built)
2. Tick S3 progress on [[../../../../feature_list/Jord/done/jord-F0012-studio]] + [[../../../../feature_list/Jord/INDEX]]
3. Close this sprint README; refresh [[../README]], [[../../README]], [[../../../../report/STATUS]], [[../../../../brain/00-Docs-Brain]], [[../../../../brain/00-Docs-Hub]]
4. Point mimir workflow active sprint at next card or “none”

## Done when

S3 acceptance matches code. Multi-tenant, OAuth, and policies remain later sprints.
