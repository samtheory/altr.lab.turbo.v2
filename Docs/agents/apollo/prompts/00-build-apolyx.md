---
title: "Prompt — apollo / build Apolyx"
description: "Copy-paste prompts that invoke the apollo sub-agent"
created: 2026-10-11
updated: 2026-10-11
tags:
  - agents
  - apollo
  - prompts
  - apolyx
---

# Prompts — apollo

## Short trigger

```
apollo
```

```
build apolyx
```

## Full handoff

```
Act as apollo (Docs/agents/apollo).
Read Docs/feature_list/ui-kit/00-intent.md and Docs/agents/apollo/instructions/00-workflow.md.
Build Apolyx in elements/ui-kit (package @altr/apolyx), apps/apolyx, elements/apolyx-cli as needed.
Hard rules: no Radix/Base UI; themes default|power-blue|power-green × light/dark; charts = SVG + visx; monorepo uses workspace import.
Load at most 2–3 skills for this task (taste + react/tailwind/motion as relevant).
Follow wave-1 order; add Storybook + a11y; summarize files touched.
```

## Execute the sprint plan

```
apollo: execute Docs/plan/ui-kit — start at the first phase not marked done.
Read the sprint README (decisions + phase table) and that phase card.
Tick boxes as tasks land, run the card's Verify block, set the phase status, then stop and summarize.
```

One phase per run keeps reviews small. To run a specific phase: `apollo: execute Docs/plan/ui-kit/03-primitives.md`.

## Add one component

```
apollo: implement [Component] for Apolyx per feature_list/ui-kit/00-intent.
Own primitives only. Tokens + CVA + Storybook. Match existing kit patterns in elements/ui-kit.
```

## Taste / polish pass

```
apollo: critique and polish [surface] with unique Apolyx taste.
Use design-taste-frontend or impeccable; keep tokens and themes; no Radix.
```

## After ship (docs)

```
update_docs: apollo shipped [what] in elements/ui-kit | apps/apolyx | elements/apolyx-cli.
Write tech_space/ui-kit note, refresh report/STATUS, link brain.
```
