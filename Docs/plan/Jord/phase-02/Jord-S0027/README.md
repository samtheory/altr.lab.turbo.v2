---
title: "Jord-S0027 — CI for Jord packages"
description: "GitHub Action: typecheck + tests for jord / jord-server / jord-studio; Postgres stays opt-in"
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

> Who: **mimir**. **Status: planned.** Feature F9. Can run **in parallel** with S0021 (preferred early so later sprints are gated). Soft link: [[../Jord-S0021/README]].

**Sprint id:** `Jord-S0027`  
**Hats:** **sindri** · **docs_man**

## Goal

Close the CI gap called out in the phase-02 review prompt: typecheck + tests must fail the PR.

## In scope

- GitHub Actions workflow: pnpm install, typecheck, unit/integration tests for `@altr/jord`, `@altr/jord-server`, `@altr/jord-studio`
- File libSQL tests always on CI
- Postgres tests remain opt-in via secret/`JORD_TEST_POSTGRES_URL` (document; do not require for green default)

## Out of scope

npm publish · full monorepo matrix for unrelated packages (unless cheap to reuse existing turbo filter) · Strix/pentest in this card

## File-level change list (expected)

| Area | Paths |
|------|-------|
| CI | `.github/workflows/jord.yml` (or extend existing workflow with a Jord job) |
| Docs | note under `tech_space/jord/overview` or lab Altr.lab how-to; STATUS |

## Definition of Done

- [ ] PR without green Jord typecheck/tests cannot merge (branch protection optional note)
- [ ] No secrets printed
- [ ] Documented in STATUS / overview
