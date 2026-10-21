---
title: "Phase 6 — verify + docs_man"
description: "Acceptance commands and vault refresh for Jord-S0006"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - jord
  - Jord-S0006
  - verify
---

# Phase 6 — verify + docs_man

> Who: **mimir** (gate) → **docs_man** (vault).

Sprint index: [[README]]

## Status

**done** (2026-10-21)

## Commands (adjust if package scripts differ)

```bash
pnpm --filter @altr/jord test
pnpm --filter @altr/jord typecheck
pnpm --filter @altr/jord-server test
pnpm --filter @altr/jord-server typecheck
pnpm --filter @altr/jord-studio typecheck
```

Manual smoke (dev:jord + Studio):

1. Login as admin → **Generated API** live → see `records` including DELETE
2. Copy curl for `GET /records?bucket=lab` (via BFF or documented server origin) → 200
3. Disable resource → list/insert → contracted disabled status
4. Re-enable → list works
5. Login as readonly → toggle disabled; DELETE try-it blocked
6. Confirm no browser path to `data/jord.db`

## Docs_man checklist

- [x] `Docs/tech_space/jord/05-s0006-generated-api.md` (as-built)
- [x] Tick cards + README definition of done
- [x] Track / STATUS / brain / feature_list / roadmap / mimir workflow

## Done when

All commands green, vault matches code. (Manual Studio smoke: operator with `dev:jord` + Studio.)
