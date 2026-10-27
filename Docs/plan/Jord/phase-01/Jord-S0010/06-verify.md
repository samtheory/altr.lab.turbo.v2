---
title: "Phase 6 — verify + docs_man close"
description: "Command proof, optional Postgres URL, as-built tech_space"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0010
  - verify
---

# Phase 6 — verify + docs_man close

> Who: **mimir** → **docs_man**. Tick acceptance from command proof only.

Sprint index: [[README]]

## Status

**done** (2026-10-24)

## Commands (expected)

```bash
pnpm --filter @altr/jord test
pnpm --filter @altr/jord typecheck
pnpm --filter @altr/jord-server test
pnpm --filter @altr/jord-server typecheck
pnpm --filter @altr/jord-studio typecheck
```

Optional, when a local Postgres is up:

```bash
JORD_TEST_POSTGRES_URL=postgres://… pnpm --filter @altr/jord test
```

Default suite must pass when that variable is unset.

## Docs close-out (after code ships)

- [x] Write `Docs/tech_space/jord/dialects/README.md`
- [x] Mark this sprint **done** in [[README]] + [[../README]]
- [x] Refresh [[../../../../report/STATUS]], [[../../../../brain/00-Docs-Brain]], [[../../../../brain/00-Docs-Hub]]
- [x] Update [[../../../../feature_list/Jord/done/jord-F0012-studio]] S8 row → done
- [x] Update [[../../../../feature_list/Jord/INDEX]], [[../../../../feature_list/Jord/done/jord-F0002-dialects]] scheme table, [[../../../00-roadmap-apolyx-jord-artemis]], mimir [[../../../../agents/mimir/instructions/00-workflow]]
- [x] Note that the Slice 0 “`file:` only” rule is lifted for `postgres:` / `postgresql:` only

## Done when

All DoD checkboxes on [[README]] are true and as-built matches code.
