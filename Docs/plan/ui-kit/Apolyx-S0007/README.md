---
title: "plan/ui-kit — Apolyx-S0007 sprint"
description: "Sprint Apolyx-S0007: motion text + display cards"
created: 2026-11-25
updated: 2026-11-25
tags:
  - plan
  - ui-kit
  - apolyx
  - sprint
  - Apolyx-S0007
  - readme
---

# plan / ui-kit — Apolyx-S0007

> Who: **apollo** executes cards; **docs_man** closes the sprint. Intent: [[../../../feature_list/ui-kit/08-apolyx-s0007-motion-cards]]. Previous: [[../Apolyx-S0006/README]].

**Sprint id:** `Apolyx-S0007`  
**Status:** done — 2026-11-25 · **Owner:** apollo · **Docs steward:** docs_man  
**Parent feature:** apolyx-F0010

## Goal

Ship motion typography and animated display cards. Clear S0006 `new` badges; mark only S0007 surfaces as `new`.

## Phases

| # | Card | Delivers | Status |
|---|------|----------|--------|
| 1 | [[01-motion-text]] | TextReveal, FlipText, TextHighlight, TextSwap, SoundRing | done |
| 2 | [[02-display-cards]] | Marquee, CountUp, Folder, Confetti, Stack, Swipe, Metric, Story, Receipt | done |
| 3 | [[03-docs-registry-verify]] | Exports, registry, Storybook, MDX, demos, badge swap | done |

## Plan-level decisions

1. NextUI is reference only — Apolyx tokens, motion, global names.
2. Semantic tokens only (highlight uses `--warning` / `--primary`, not hard hex).
3. Intersection-gated loops; `useReducedMotion` freezes or shows end state.
4. ConfettiCard may use a simplified rain (not full NextUI physics) if taste holds.
