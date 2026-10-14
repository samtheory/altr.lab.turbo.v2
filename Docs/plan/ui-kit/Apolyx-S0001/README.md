---
title: "plan/ui-kit — Apolyx-S0001 sprint"
description: "Phased build plan for Apolyx v1 (sprint Apolyx-S0001): rename, tokens, primitives, wave-1, motion, charts, registry + CLI, docs app — closed"
created: 2026-10-11
updated: 2026-10-11
tags:
  - plan
  - ui-kit
  - apolyx
  - sprint
  - Apolyx-S0001
  - readme
---

# plan / ui-kit — Apolyx-S0001

> Who: **apollo** (executed the cards) and anyone auditing the sprint. Intent: [[../../../feature_list/ui-kit/00-intent]]. Durable truth now lives in [[../../../tech_space/ui-kit/README]].

**Sprint id:** `Apolyx-S0001`  
**Status:** **closed** — opened 2026-10-11 · closed 2026-10-11 · **Owner:** apollo · **Docs steward:** docs_man

## Phases

| # | Card | Delivers | Status |
|---|------|----------|--------|
| 1 | [[01-rename-package]] | `@altr/apolyx` everywhere | done |
| 2 | [[02-tokens-and-themes]] | OKLCH 3×2, ApolyxProvider, Storybook switcher | done |
| 3 | [[03-primitives]] | Slot + focus/layer primitives; Radix removed | done |
| 4 | [[04-wave-1-components]] | 14 simple components + stories | done |
| 5 | [[05-motion-recipes]] | FadeIn, Stagger, Pressable, HoverLift | done |
| 6 | [[06-charts]] | ChartContainer, LineChart, BarChart (SVG + visx) | done |
| 7 | [[07-wave-1b-overlays]] | Dialog, DropdownMenu, Tabs, Tooltip, Toast | done |
| 8 | [[08-registry-and-cli]] | 51 manifests, import checks, CLI + external smoke | done |
| 9 | [[09-docs-app]] | MDX docs on :3004, previews, `/r` | done |
| 10 | [[10-verify-and-handoff]] | Acceptance sweep + docs_man close | done |

## Carry-overs

Deferred intentionally — tracked in [[../../../feature_list/ui-kit/01-apolyx-s0001-carryovers]] (remote registry, `diff`/`update`, npm publish, docs search, submenus, blocks, candlestick, automated Lighthouse/a11y CI).

## Links

- As-built: [[../../../tech_space/ui-kit/README]]
- Status: [[../../../report/STATUS]]
- Code: `elements/ui-kit` · `elements/apolyx-cli` · `apps/apolyx`
