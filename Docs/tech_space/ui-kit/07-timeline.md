---
title: "Apolyx Timeline — as-built"
description: "How the Apolyx Timeline is built: CSS-variable rail geometry, derived step states, tones, four layouts, tests, docs"
created: 2026-10-14
updated: 2026-10-14
tags:
  - tech-space
  - ui-kit
  - apolyx
  - timeline
---

# Apolyx Timeline — as-built

> Who: anyone changing or extending the Timeline. Intent: [[../../feature_list/ui-kit/03-timeline]]. Code wins over this note if they disagree.

## Files

| Path | Role |
|------|------|
| `elements/ui-kit/src/components/ui/timeline.tsx` | Component (8 parts) |
| `elements/ui-kit/src/components/ui/timeline.test.tsx` | Vitest: states, `aria-current`, horizontal forcing stacked, `aria-hidden` |
| `elements/ui-kit/src/components/ui/timeline.stories.tsx` | `UI/Timeline`: Playground, SplitDates, Alternate, Horizontal, WithIcons, StatusTones |
| `elements/ui-kit/registry/timeline.json` | Registry item (deps: `class-variance-authority`; registry: `utils`) |
| `apps/apolyx/src/content/docs/components/timeline.mdx` | Docs page |
| `apps/apolyx/src/demos/timeline-*.tsx` | 9 demos: default, progress, split, icons, alternate, horizontal, roadmap, status, pipeline |

Exported from `@altr/apolyx` with types `TimelineProps`, `TimelineItemProps`, `TimelineIndicatorProps`, `TimelineState`, `TimelineTone`.

## Geometry

`Timeline` (an `<ol>`) sets CSS variables through CVA, and every part positions itself from them:

| Variable | Set by | Meaning |
|----------|--------|---------|
| `--tl-indicator` | `size` (sm 0.625rem · md 1rem · lg 1.5rem) | Indicator diameter |
| `--tl-gap` | `size` | Rail to content spacing |
| `--tl-rail` | `layout` | Rail centre x from the item start (`split` adds `--tl-gutter: 7rem`; `alternate` is `50%`) |
| `--tl-offset` | root | Centres the indicator on the first 1.25rem text line |
| `--tl-tone` / `--tl-tone-fg` | `tone` on root, item, or indicator | Fill colour for reached indicators and the progress line |

Indicator and separator are `absolute` inside the `relative` item, so their order inside the item does not matter. The separator runs from below this item's indicator to just above the next item's indicator, and hides on the last item with `group-last/timeline-item:hidden` (items must be direct children of the list).

Horizontal: items are `flex-1` with indicators on top; the separator runs from the indicator to the item's end edge. `layout` is forced to `stacked` for horizontal.

## State

`value` (or `defaultValue`, default `0`) is the last reached step. Each item computes:

| `data-state` | Rule | Indicator | Outgoing line |
|--------------|------|-----------|---------------|
| `completed` | `step < value` | Filled | Filled |
| `current` | `step === value` | Filled + 4px tone halo, `aria-current="step"` | Track |
| `upcoming` | `step > value` | Hollow, `border` token | Track |

`data-completed` is also set when `step <= value`, for ReUI-style selectors. The line fill is a `scale-y` / `scale-x` transform using `--duration-slow` and `--ease-out`; `motion-reduce:transition-none` disables it.

## Tones

`primary` (default), `success`, `warning`, `info`, `destructive`, `muted` map to the matching semantic tokens. Item `tone` colours the indicator and the line leaving it; indicator `tone` overrides only the dot.

## Verification (2026-10-14)

- `pnpm --filter @altr/apolyx test` for the timeline file: 5 passed; `typecheck` clean
- Registry build: 52 items (was 51)
- Docs app `tsc --noEmit` clean; `/docs/components/timeline` renders all nine demos
- Screenshots (headless Edge, default theme dark): `Docs/report/assets/apolyx-timeline/`

## Known limits

- Display-only: no keyboard model and no `onValueChange`.
- `split` gutter is a fixed 7rem; override `--tl-gutter` with a class for longer dates.
- `alternate` gives every item its own row (no interleaving of the two sides).
