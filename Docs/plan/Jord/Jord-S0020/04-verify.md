---
title: "Phase 4 — verify hard vectors"
description: "Commands that closed Jord-S0020"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0020
  - vectors
---

# Phase 4 — verify

> Who: **mimir** → **docs_man**. Sprint: [[README]].

## Status

**done** (2026-10-24)

## Commands

- `pnpm --filter @altr/jord test` — 16 files, 46 passed, 3 skipped
- `pnpm --filter @altr/jord exec tsc --noEmit`
- `pnpm --filter @altr/jord-server test` — 3 files, 35 passed
- `pnpm --filter @altr/jord-server exec tsc --noEmit`
- `pnpm --filter @altr/jord-studio exec tsc --noEmit`

Postgres vector ranking stays behind `JORD_TEST_POSTGRES_URL` (skipped here).

## Done when

- [x] Proof above
- [x] As-built [[../../../tech_space/jord/19-s0020-hard-vectors]]
- [x] Numbered backlog empty
