---
title: "Apolyx-S0002 as-built — contrast tokens, navigation, physics Switch, Field, data"
description: "How sprint Apolyx-S0002 was implemented in elements/ui-kit and apps/apolyx"
created: 2026-10-11
updated: 2026-10-11
tags:
  - tech-space
  - ui-kit
  - apolyx
  - Apolyx-S0002
  - navigation
  - motion
  - forms
  - data
---

# Apolyx-S0002 as-built

> Who: implementers and reviewers. Code truth for sprint **Apolyx-S0002**. Intent: [[../../feature_list/ui-kit/02-apolyx-s0002-wave]] · Cards: [[../../plan/ui-kit/Apolyx-S0002/README]].

All paths below are under `elements/ui-kit/` unless noted.

## Hover contrast tokens

| Token | Tailwind color | Used by |
|-------|----------------|---------|
| `--primary-hover` | `primary-hover` | Button default, Switch checked track, link hover |
| `--primary-glow` | `primary-glow` | Button default hover shadow |
| `--secondary-hover` | `secondary-hover` | Button secondary |
| `--destructive-hover` | `destructive-hover` | Button destructive |
| `--accent-hover` | `accent-hover` | Button outline / ghost, DropdownMenu items, Tabs triggers, Table rows |
| `--border-strong` | `border-strong` | Outline hover, Input / Field hover, Switch unchecked track |

- Defined for light and dark in `src/styles/themes/default.css`, `power-blue.css`, `power-green.css`.
- Mapped in `src/styles/tokens.css` (`@theme inline`) and listed in `cssVariableTokens` (`src/theme/index.ts`) so the docs TokenTable shows them.
- Dark default pushes primary hover to pure white plus a soft glow, because the resting primary is already near-white.
- Button transitions colour, border, shadow and transform on `--duration-fast`; `active:scale-[0.98]` gives a press step.

## Navigation

| Component | File | Notes |
|-----------|------|-------|
| Dialog `size` | `src/components/ui/dialog.tsx` | `sm` / `md` / `lg` / `xl` / `full`, written to `data-size`. `full` becomes a flex column with a scrollable body. Exports `useDialogContext`. |
| Sheet | `src/components/ui/sheet.tsx` | Reuses Dialog state (`Sheet` = `Dialog` without `alert`), so it inherits Portal, FocusScope, DismissableLayer and scroll lock. `side` picks entries from `layerPosition` / `panelSize` / `offscreen` maps. Spring slide-in, 0.18 s tween out; reduced motion = opacity only. Built-in close button (`showClose`). |
| Breadcrumb | `src/components/ui/breadcrumb.tsx` | `nav` → `ol`; `BreadcrumbPage` has `aria-current="page"`; separators / ellipsis are `aria-hidden`. `BreadcrumbLink asChild` for router links. |
| NavigationMenu | `src/components/ui/navigation-menu.tsx` | Controllable `value` (open item). Hover intent via `openDelay` 120 ms / `closeDelay` 220 ms timers per item. Panel is an inline (not portaled) passive `DismissableLayer` with the trigger in `ignoreRefs`; Escape / outside click close and return focus to the trigger. Left / Right move across `[data-nav-top]`; ArrowDown opens. |
| NavList | `src/components/ui/nav-list.tsx` | `nav` → labelled `ul` groups. Active item: `aria-current="page"` + a primary bar drawn with `before:`. Disabled: `aria-disabled` + `tabIndex=-1`. |

## Physics Switch

File: `src/components/ui/switch.tsx`.

- Thumb `left` and `width` are Motion values (`useMotionValue<number>`); the track is a plain button with `role="switch"`.
- Geometry per size: `md` thumb 20 / travel 18 / press stretch 6 / wall stretch 5; `sm` 16 / 14 / 4 / 4.
- `place(desired, dir)` stretches the thumb by `press + min(overshoot × 0.35, wall)` toward `dir` and clamps it between the rails, so it squashes into the wall instead of leaving the track.
- `settle(target)` springs `left` (stiffness 520, damping 20) and then `width` (stiffness 640, damping 13, 50 ms delay). The low damping on width gives the end-of-travel bounce.
- Pointer flow: `pointerdown` captures and press-stretches; `pointermove` beyond `DRAG_THRESHOLD` (3 px) drags; `pointerup` commits when the thumb centre passed `travel / 2`, else snaps back. A `suppressClick` flag eats the click that follows a drag so it does not toggle twice.
- `useReducedMotion()` skips stretch and springs (values are set directly).
- Hidden form input and `name` / `value` behaviour unchanged.

Tests (`switch.test.tsx`): click toggles once, drag past midpoint commits, short drag snaps back. `vitest.setup.ts` adds a `PointerEvent` polyfill because jsdom lacks one (without it `clientX` is dropped and drag tests pass vacuously).

## Field

Files: `src/components/ui/field.tsx`, plus polish in `input.tsx` / `textarea.tsx`.

- `Field` provides context (`id`, `describedBy`, `invalid`, `required`, `disabled`) consumed by `FieldInput` / `FieldTextarea`, which set `aria-describedby`, `aria-invalid`, `required`.
- Control box is `group/control` with `data-filled` / `data-invalid`. Focus: border to `ring`, 3 px ring at 25 %, and an `after:` accent bar that scales in on X. Blur uses `--duration-slow`, focus `--duration-base`, so defocus eases out slower.
- **Floating:** label is absolute with `bg-inherit`; on `focus-within` or `data-filled` it moves to `top-0` and scales to 0.82, sitting on the border. Filled state is tracked in JS (`useFilledSync`) rather than `:placeholder-shown`, so controlled values and autofill work.
- **Inline:** label in a muted panel with `border-r`, width from `labelWidth`.
- `FieldError` is `role="alert"` with the `apolyx-field-error` keyframe (motion-safe only).
- `Input` / `Textarea`: `hover:border-border-strong`, focus ring transition.

Tests (`field.test.tsx`): description + error wired through `aria-describedby` / `aria-invalid`, filled state while typing, filled from `defaultValue` (including textarea).

## Data

| Component | File | Notes |
|-----------|------|-------|
| Table | `src/components/ui/table.tsx` | Bordered scroll container; `tableVariants` density + striped; `stickyHeader`; `TableRow selected` → `data-state` + `aria-selected`; `TableHead scope="col"`. |
| List | `src/components/ui/list.tsx` | `variant` plain / divided / card via context; `ListItem asChild` makes the row a link or button with hover / focus styles. Slots: leading, content (title, description), trailing. |
| Grid | `src/components/ui/grid.tsx` | `cols` number or `{ base, sm, md, lg, xl }` resolved through a literal class table (so Tailwind sees every class); `minItemWidth` switches to `repeat(auto-fill, minmax(…, 1fr))`; `gap` scale. |

## Registry and docs app

- Manifests added: `sheet`, `breadcrumb`, `navigation-menu`, `nav-list`, `field`, `table`, `list`, `grid`; `switch` now lists `motion` + `use-reduced-motion`. `pnpm build` (registry) → **59 items**, imports resolved.
- `apps/apolyx`: new MDX pages + demos for all eight, sidebar groups **Navigation** and **Data** in `src/docs-config.ts`; Switch and Dialog pages document `size` and physics. 41 MDX pages.
- Stories: `navigation.stories.tsx` (AppShell, SheetSides, ModalSizes), `switch.stories.tsx` Physics, `field.stories.tsx`, `data.stories.tsx`, `button.stories.tsx` HoverContrastDark.

## Fix found in verify

`list.tsx` (module-level `createContext`) and `nav-list.tsx` (hook) shipped without `"use client"`. Because docs pages import the `@altr/apolyx` barrel from Server Components, every `/docs/*` route returned 500. Adding the directive fixed it. Rule: any kit module that creates context or calls hooks must start with `"use client"`, even when it looks presentational.

## Verification

- `elements/ui-kit`: typecheck clean; Vitest 20 files / 54 tests pass; registry build OK.
- `apps/apolyx`: typecheck clean; all new and touched component pages return 200 on the dev server.
