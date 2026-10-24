---
title: "Phase 6 — verify + docs_man close"
description: "Command proof, as-built tech_space, STATUS/brain/roadmap refresh"
created: 2026-10-23
updated: 2026-10-23
tags:
  - plan
  - jord
  - Jord-S0009
  - verify
---

# Phase 6 — verify + docs_man close

> Who: **mimir** → **docs_man**. Tick acceptance from command proof only.

Sprint index: [[README]]

## Status

**done** (2026-10-23)

## Commands (expected)

```bash
pnpm --filter @altr/jord test
pnpm --filter @altr/jord typecheck
pnpm --filter @altr/jord-server test
pnpm --filter @altr/jord-server typecheck
pnpm --filter @altr/jord-studio typecheck
```

## Docs close-out (after code ships)

- [x] Write `Docs/tech_space/jord/policies/README.md`
- [x] Mark this sprint **done** in [[README]] + [[../README]]
- [x] Refresh [[../../../../report/STATUS]], [[../../../../brain/00-Docs-Brain]], [[../../../../brain/00-Docs-Hub]]
- [x] Update [[../../../../feature_list/Jord/03-jord-studio]] S7 row → done
- [x] Update [[../../../../feature_list/Jord/01-phase-02-candidates]], [[../../../00-roadmap-apolyx-jord-artemis]], mimir [[../../../../agents/mimir/instructions/00-workflow]]

## Done when

All DoD checkboxes on [[README]] are true and as-built matches code.
