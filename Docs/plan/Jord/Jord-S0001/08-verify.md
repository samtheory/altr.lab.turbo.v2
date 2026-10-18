---
title: "Phase 8 — verify Jord-S0001"
description: "Run the Slice 0 acceptance commands, then hand the as-built note to docs_man"
created: 2026-10-18
updated: 2026-10-18
tags:
  - plan
  - jord
  - Jord-S0001
---

# Phase 8 — verify Jord-S0001

> Who: implementer for the commands. **docs_man** for the vault after the code is actually in the tree. Do not write `tech_space` before that.

Sprint index: [[README]] · Acceptance: [[../../../feature_list/Jord/00-intent]]

## Commands

- [ ] `pnpm --filter @altr/jord test`
- [ ] `pnpm --filter @altr/jord typecheck`
- [ ] `pnpm --filter @altr/jord-server typecheck`
- [ ] `pnpm --filter @altr/base typecheck`
- [ ] `git check-ignore -v data/jord.db` hits `data/*.db` or `data/**/*.db`
- [ ] Manual or scripted: server POST + GET round-trip; PATCH stale `version` → 409

## Acceptance map

Tick the boxes in [[../../../feature_list/Jord/00-intent]] only when the command or test above proves that line. Leave them unchecked until then.

## After the code lands

docs_man, in a follow-up:

1. `Docs/tech_space/` note for how Jord-S0001 was wired (paths, pragmas, checkpoint, OCC)
2. Refresh [[../../../report/STATUS]] implemented vs planned
3. Refresh [[../../../brain/00-Docs-Brain]]

## Done when

The command list is green and the intent acceptance list is checked against those results. Studio is still absent from `apps/`.
