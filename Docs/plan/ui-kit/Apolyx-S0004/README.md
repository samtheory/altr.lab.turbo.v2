---
title: "plan/ui-kit — Apolyx-S0004 sprint"
description: "Sprint Apolyx-S0004: owned Popover primitive, origin-aware pop / slide / fade motion, and docs recipes for every Shadcn Studio popover kind"
created: 2026-10-18
updated: 2026-10-18
tags:
  - plan
  - ui-kit
  - apolyx
  - sprint
  - Apolyx-S0004
  - readme
---

# plan / ui-kit — Apolyx-S0004

> Who: **apollo** (executed cards) and **docs_man** (closed the sprint). Intent: [[../../../feature_list/ui-kit/05-apolyx-s0004-popover]]. Previous sprint: [[../Apolyx-S0003/README]]. As built: [[../../../tech_space/ui-kit/09-s0004-popover]].

**Sprint id:** `Apolyx-S0004`  
**Status:** closed — opened and closed 2026-10-18 · **Owner:** apollo · **Docs steward:** docs_man

## Goal

Ship one Popover that can hold any interactive panel, animate it from the trigger in the Apolyx motion language, and show every [Shadcn Studio popover kind](https://shadcnstudio.com/docs/components/popover?base=base) as a docs recipe.

## Phases

| # | Card | Delivers | Status |
|---|------|----------|--------|
| 1 | [[01-popover-primitive]] | Parts, placement, focus, dismiss, hover trigger, anchor | done |
| 2 | [[02-popover-motion]] | `motion="pop" | "slide" | "fade"`, origin at the trigger, reduced motion | done |
| 3 | [[03-popover-recipes]] | Docs demos for all 15 reference kinds, plus an input-group addon recipe | done |
| 4 | [[04-docs-registry-verify]] | MDX page, exports, registry, tests, typecheck, screenshots | done |
| 5 | [[05-docs-man-handoff]] | feature_list ticks + tech_space note + report + brain | done |

## Plan-level decisions

1. **No new runtime deps. No Radix, no Base UI.** Popover is Portal + Presence + DismissableLayer + FocusScope + `useFloating`, the same stack as Dropdown Menu and Tooltip ([[../../../tech_space/ui-kit/03-overlays]]).
2. **One component, many recipes.** The 15 reference files are content. They do not become `PopoverRatings`, `PopoverCoupon`, and so on.
3. **Explicit parts, not boolean props.** `PopoverTitle` / `PopoverDescription` / `PopoverClose` are parts. There is no `showArrow`, `confirm`, or `withForm` flag.
4. **`trigger` is an enum, not two booleans.** `"click"` (default) or `"hover"`. Hover is how we cover a hover card without a second component.
5. **Motion is a named prop.** `pop` | `slide` | `fade` on `PopoverContent`. The reference zoom-from-zero profile is retargeted to `pop`.
6. **Only `transform` and `opacity`.** Origin is the edge facing the trigger, computed from the resolved side and align.
7. **Semantic tokens.** Stars use `warning`. Destructive icons use `destructive`.
8. **Popover is not a menu and not a hint.** Action lists stay `DropdownMenu`. Non-interactive hints stay `Tooltip`. Blocking work stays `Dialog` / `AlertDialog`.
9. **No Select, Combobox, Slider, date picker, or color picker.** Volume and filter recipes use the styled native range. Search is a local filter, not a listbox.
10. **Popover inside Dialog is required.** Escape and outside pointer hit the top layer only.

## Counts at close

| What | After S0003 | After S0004 |
|------|-------------|-------------|
| Registry items | 66 | **67** (`popover`) |
| Docs MDX pages | 48 | **49** (Popover). Input Group gained a section |
| Vitest tests | 141 | **149** |

## Definition of done (sprint)

- [x] Every card's "Done when" holds.
- [x] `pnpm --filter @altr/apolyx test`, `typecheck`, `build` (registry) green; `tsc` clean in `apps/apolyx`.
- [x] Light and dark screenshots under `Docs/tech_space/ui-kit/assets/apolyx-s0004/`.
- [x] docs_man handoff done (card 5).

## Links

- Track index: [[../README]]
- Intent: [[../../../feature_list/ui-kit/05-apolyx-s0004-popover]]
- As-built: [[../../../tech_space/ui-kit/09-s0004-popover]]
- Overlay base: [[../../../tech_space/ui-kit/03-overlays]]
- Builder: [[../../../agents/apollo/00-index]]
