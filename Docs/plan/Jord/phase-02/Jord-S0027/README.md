---
title: "Jord-S0027 — CI for Jord packages"
description: "First phase-02 execution step: typecheck + tests before auth work"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0027
  - phase-02
  - ci
---

# Jord-S0027 — CI for Jord packages

> Who: **mimir**. **Status: implemented locally — awaiting PR / Actions green + branch-protection admin.** Execution #1 — runs first, before any S0021 work. Feature F9. Next: [[../Jord-S0021/README]] Part A.

**Sprint id:** `Jord-S0027`  
**Hats:** **sindri** · **docs_man**

The id stays S0027 (already filed). It **runs first, before any S0021 work**. It is the safety net for the auth work.

## Goal

A PR cannot merge Jord type or test failures before principal auth lands.

## In scope

- GitHub Actions: pnpm install, typecheck, unit/integration for `@altr/jord`, `@altr/jord-server`, `@altr/jord-client`, `@altr/jord-studio`
- File libSQL tests always
- Postgres opt-in via secret / `JORD_TEST_POSTGRES_URL` (not required for the default green job)

## Out of scope

npm publish · unrelated workspace packages · Strix

## Deviations (approved Phase 1)

- **`@altr/jord-studio`:** typecheck only. There is no `test` script in `apps/jord-studio/package.json`; CI does not invent one.
- **Triggers:** `pull_request` and `push` to `main` — **no** `paths:` filter.
- **Node:** **22 (LTS)** in CI — not the Phase 1 host’s Current major (25). `engines: >=20` allows 25, but CI uses LTS for support window and libSQL native binaries. pnpm from root `packageManager` (`10.27.0`).
- **Branch protection:** requiring check `jord` is a manual admin step — DoD item stays **UNVERIFIED** until an admin configures it after a real Actions run.
- **`jord-postgres`:** green with skipped steps does **not** prove Postgres was tested (secret absent / forks). Only a run where live steps execute counts.

## File-level change list (expected)

| Area | Paths |
|------|-------|
| CI | `.github/workflows/jord.yml` |
| Docs | `tech_space/jord/overview` CI note; STATUS; this README status line |

## Definition of Done

- [x] Workflow file exists; local typecheck/test green on Phase 1/3 host (Windows). Ubuntu Actions green: **UNVERIFIED** until PR push.
- [x] No secrets printed (workflow never echoes `JORD_TEST_POSTGRES_URL`)
- [x] Documented in STATUS / overview
- [ ] Branch protection requires check `jord` — **UNVERIFIED** (manual admin)
