---
title: "Apolyx Timeline — intent"
feature_id: apolyx-F0004
description: "Timeline component for Apolyx with parity to the ReUI timeline examples, built on Apolyx tokens with no Base UI"
created: 2026-10-14
updated: 2026-10-14
tags:
  - feature
  - ui-kit
  - apolyx
  - timeline
---

# Apolyx Timeline — intent

> Who: anyone extending the Apolyx catalog past wave 1. Reference: [ReUI Timeline](https://reui.io/docs/components/base/timeline). Code truth: [[../../tech_space/ui-kit/07-timeline]].

## Why

Roadmaps, release histories, order tracking, activity feeds, and build pipelines all need the same "events on a rail" shape. ReUI ships one on Base UI; Apolyx needs its own (no Radix / Base UI, see [[00-intent]]).

## Scope

Match the ReUI example set, with Apolyx taste and token colours:

| Case | ReUI example | Apolyx approach |
|------|--------------|-----------------|
| Default vertical | Basic | `layout="stacked"` (default) |
| Dates in a left column | With left-aligned dates | `layout="split"` |
| Check icons for done steps | With custom indicators | `size="lg"` + icon child |
| Icon per event | With icons | `size="lg"` + icon child |
| Two-sided | Alternating layout | `layout="alternate"` |
| Row | Horizontal / top indicators | `orientation="horizontal"` |
| Coloured dots | Compact roadmap | `size="sm"` + item `tone` |
| Success / failed | Deployments feed | item `tone="success" \| "destructive"` |
| Running step with rich content | Activity feed / pipeline | spinner in indicator, cards in content |

Same part names as ReUI (`Timeline`, `TimelineItem`, `TimelineHeader`, `TimelineDate`, `TimelineTitle`, `TimelineIndicator`, `TimelineSeparator`, `TimelineContent`) so ReUI snippets port with few changes.

## Deliberate differences from ReUI

- Layouts, sizes, and tones are **props**, not long `group-data-[orientation=…]` class overrides.
- `defaultValue` is `0` (nothing reached), not `1`.
- No `onValueChange`: the timeline is display-only. A clickable flow is a future Stepper.
- Three item states (`completed` / `current` / `upcoming`) instead of only `data-completed`.

## Acceptance

- [x] All cases in the scope table render in the docs app
- [x] Semantic tokens only; works under every theme family × mode
- [x] Native `<ol>` / `<li>`, `aria-current="step"`, decorative parts `aria-hidden`
- [x] Progress-line animation respects `prefers-reduced-motion`
- [x] Storybook story, Vitest tests, registry item, MDX page

## Links

- Intent hub: [[README]] · Kit intent: [[00-intent]]
- As-built: [[../../tech_space/ui-kit/07-timeline]]
