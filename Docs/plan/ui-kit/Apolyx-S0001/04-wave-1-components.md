---
title: "Phase 4 — wave 1 components"
description: "Button through Kbd: simple Apolyx components with variants, a11y, and Storybook stories"
created: 2026-10-11
updated: 2026-10-11
tags:
  - plan
  - ui-kit
  - apolyx
  - components
---

# Phase 4 — wave 1 components

> Who: apollo. The first real catalog. Each item follows the per-component checklist in [[../../../agents/apollo/instructions/00-workflow#Per-component checklist]].

Sprint index: [[README]] · Intent: [[../../../feature_list/ui-kit/00-intent#Primitives / UI (wave 1)]]

**Depends on:** phases 2 and 3 · **Skills:** `design-taste-frontend` (or `impeccable`) + `vercel-react-best-practices` + `fixing-accessibility`

## Shared rules for every component

- File in `src/components/ui/<name>.tsx`, story `<name>.stories.tsx` next to it, export from `src/index.ts`
- `cva` variants + `cn`; `className` accepted on every part
- `ref` as a prop (React 19); spread remaining native props
- Only semantic tokens; no hex / oklch literals in components
- `data-slot="<name>"` on the root (stable styling hook for consumers)
- Story covers: every variant × size, disabled, and a "themes" story that renders under `power-blue` dark

## Components (suggested order)

| # | Component | Parts | Behavior / a11y notes |
|---|-----------|-------|-----------------------|
| 1 | Button | `Button`, `buttonVariants` | Restyle with Apolyx taste; add `loading` prop (spinner + `aria-busy`, keeps width); sizes `sm` / `md` / `lg` / `icon` |
| 2 | Text / Heading | `Text`, `Heading` | `as` prop for semantic level; size scale from tokens; `muted` tone |
| 3 | Label | `Label` | `htmlFor`; disabled style via peer |
| 4 | Input | `Input` | `aria-invalid` styling; works with `Label`; file input reset |
| 5 | Textarea | `Textarea` | Optional `autoResize` |
| 6 | Checkbox | `Checkbox` | `button role="checkbox"`, `aria-checked` incl. `"mixed"`, Space toggles, hidden native input for forms, controllable state |
| 7 | Switch | `Switch` | `role="switch"`, `aria-checked`, Space / Enter, hidden native input, controllable |
| 8 | Card | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` | Restyle existing; `CardTitle` renders a heading level via `as` |
| 9 | Badge | `Badge` | Restyle; add `success` / `warning` / `info` variants |
| 10 | Avatar | `Avatar`, `AvatarImage`, `AvatarFallback` | Image load state machine; fallback after optional delay |
| 11 | Separator | `Separator` | `role="separator"` + `aria-orientation`, or `decorative` → `role="none"` |
| 12 | Spinner / Skeleton | `Spinner`, `Skeleton` | Spinner `role="status"` + visually hidden label; skeleton pulse disabled under reduced motion |
| 13 | Alert | `Alert`, `AlertTitle`, `AlertDescription` | `role="alert"` only for `destructive`, `role="status"` otherwise; status variants |
| 14 | Kbd | `Kbd`, `KbdGroup` | `<kbd>` semantics |

## Tasks

- [x] Components 1–14 per the table, each with story
- [x] Unit tests for Checkbox and Switch (keyboard + controlled / uncontrolled + form value)
- [x] `Foundations/Overview` story: a composed sample screen (form card with label, inputs, checkbox, switch, buttons, badge, alert) used for visual review under all 6 palettes
- [x] Update `apps/hub/src/app/docs-preview/page.tsx` to show the new set (cheap live check inside Next)
- [x] Taste review pass with `impeccable` (critique mode) on the Overview story; fix findings

## Verify

```bash
pnpm --filter @altr/apolyx test
pnpm --filter @altr/apolyx typecheck
pnpm build:storybook:ui-kit               # a11y addon: zero violations on wave-1 stories
pnpm --filter @altr/hub build
```

## Done when

- 14 components exported, storied, a11y-clean in Storybook
- Overview story looks intentional in all 6 palettes
- **Handoff:** run `update_docs` → docs_man opens `tech_space/ui-kit/` with tokens + primitives + wave 1
