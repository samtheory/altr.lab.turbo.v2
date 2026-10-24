---
title: "Phase 6 — verify + docs_man"
description: "Acceptance commands and vault refresh for Jord-S0007"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - jord
  - Jord-S0007
  - verify
---

# Phase 6 — verify + docs_man

> Who: **mimir** (gate) → **docs_man** (vault).

Sprint index: [[README]]

## Status

**done** (2026-10-21)

## Commands

```bash
pnpm --filter @altr/jord test
pnpm --filter @altr/jord typecheck
pnpm --filter @altr/jord-server test
pnpm --filter @altr/jord-server typecheck
pnpm --filter @altr/jord-studio typecheck
```

Manual smoke (`dev:jord` + Studio):

1. Admin → Jobs → create `echo` → Run now → run shows `ok`
2. Enable short interval → next run advances; Logs show job + http events
3. Readonly → Jobs list visible; Run now disabled / 403
4. Confirm no browser access to `data/jord.db`

## Docs_man checklist

- [ ] `Docs/tech_space/jord/jobs/README.md`
- [ ] Tick cards + README DoD
- [ ] Track / STATUS / brain / feature_list / roadmap / mimir workflow
- [ ] [[../../../../feature_list/Jord/03-jord-studio]] S5 → done

## Done when

Commands green; vault matches code.
