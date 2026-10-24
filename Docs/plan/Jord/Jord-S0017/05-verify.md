---
title: "Phase 5 — verify + docs_man closeout"
description: "Tests, as-built tech_space, advance track to S0018"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0017
  - verify
---

# Phase 5 — verify + docs

> Who: **mimir** → **docs_man**.

Sprint: [[README]]

## Status

**done** (2026-10-24)

## Commands

```bash
pnpm --filter @altr/jord test
pnpm --filter @altr/jord typecheck
pnpm --filter @altr/jord-server test
pnpm --filter @altr/jord-server typecheck
pnpm --filter @altr/jord-studio typecheck
# optional:
# JORD_TEST_POSTGRES_URL=postgres://… pnpm --filter @altr/jord test
```

## Docs closeout

- [x] `Docs/tech_space/jord/16-s0017-postgres-rls.md`
- [x] Mark this sprint **done**; [[../README]] next = S0018
- [x] [[../00-remaining-backlog]] · STATUS · brain · Jord-implemented-review
- [x] Reminder: **S0020 is last numbered**

## Done when

Green verify + vault points at S0018 — **met 2026-10-24**.
