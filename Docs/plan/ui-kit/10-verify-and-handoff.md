---
title: "Phase 10 — verify and hand off"
description: "Sprint-end acceptance sweep against the intent note, then docs_man closes the sprint"
created: 2026-10-11
updated: 2026-10-11
tags:
  - plan
  - ui-kit
  - apolyx
  - verification
---

# Phase 10 — verify and hand off

> Who: apollo runs the sweep; docs_man writes the as-built docs and closes the sprint folder.

Sprint index: [[README]] · Intent acceptance list: [[../../feature_list/ui-kit/00-intent#Acceptance criteria (later — when Apolyx v1 infra ships)]]

**Depends on:** all earlier phases · **Skills:** `playwright-cli` + `fixing-accessibility`

## Acceptance sweep (mirrors intent)

- [ ] Apolyx `Slot` in use; zero Radix / Base UI in `elements/ui-kit` and `elements/apolyx-cli` (`rg "@radix-ui|@base-ui"` empty, lockfile check)
- [ ] Token files for `default` / `power-blue` / `power-green` × light/dark; docs app and Storybook switch both axes
- [ ] Registry manifest + `apolyx add` works for Button and its deps (fresh-app smoke from phase 8 re-run)
- [ ] `apps/apolyx` serves an MDX page for Button and an index of wave-1 components
- [ ] Storybook runs for the same components
- [ ] At least one motion recipe and one chart installable via CLI and documented
- [ ] Customization story documented on `/docs/theming`: tokens + variants + CLI-owned edits

## Repo health

```bash
pnpm install
pnpm typecheck
pnpm --filter @altr/apolyx test
pnpm --filter apolyx test
pnpm build
pnpm build:storybook:ui-kit
```

- [ ] All commands above pass
- [ ] `hub`, `web`, `dashboard`, `trading-ui` still build and render in light / dark
- [ ] Screenshots of docs home + Button page under `default` light and `power-blue` dark, saved for the report

## Hand off to docs_man (`update_docs`)

- [ ] `Docs/tech_space/ui-kit/` notes: tokens + theming, primitives, components, motion, charts, registry + CLI, docs app (as-built, code paths, decisions that changed vs this plan)
- [ ] `Docs/report/STATUS.md`: Apolyx v1 implemented / remaining / planned
- [ ] Tick the "later" acceptance boxes in [[../../feature_list/ui-kit/00-intent]]
- [ ] `Docs/Altr.lab/` structure + commands: new packages, ports, scripts
- [ ] Brain + hub: point Apolyx row at `tech_space/ui-kit/`
- [ ] Close this sprint: mark [[README]] status `closed`, list carry-overs as a new feature_list note or the next plan

## Carry-overs to expect

Remote registry fetch, `diff` / `update`, npm publish of `apolyx`, docs search, blocks, submenus, candlestick chart (canvas OHLC) — each becomes a feature_list or plan item, not silent scope creep.
