---
title: "Phase 3 — Input and Field extras"
description: "Input sizes, variants, pill shape and styled native types; Field label aside, optional mark, horizontal orientation, FieldCounter, multiple errors"
created: 2026-10-14
updated: 2026-10-14
tags:
  - plan
  - ui-kit
  - apolyx
  - forms
  - inputs
  - Apolyx-S0003
---

# Phase 3 — Input and Field extras

> Who: apollo. Make the low-level `Input` cover every look and native type, and give `Field` the label extras and states the references use.

Sprint index: [[README]] · Code: `src/components/ui/input.tsx`, `field.tsx` · Inventory: [[../../../feature_list/ui-kit/04-apolyx-s0003-switch-inputs#Input]]

## `Input` (CVA)

| Prop | Values | Look |
|------|--------|------|
| `size` | `sm` (h-8) · `md` (h-10, default) · `lg` (h-11) | Text `text-xs` / `text-sm` / `text-base` |
| `variant` | `outline` (default) · `filled` · `underline` · `ghost` | `filled`: `bg-muted`, border transparent until hover / focus · `underline`: only bottom border, no radius, focus bar grows from center (same as Field's accent) · `ghost`: no border or background until hover / focus |
| `shape` | `default` · `pill` | `pill`: `rounded-full px-4` |

Native types styled in the base class (no extra props):

- `file`: `file:` pseudo button styled as a small secondary button inside the input
- `color`: swatch fills the box with rounded inner corners; hex value readout is a recipe
- `range`: accent uses `--primary`; thumb and track styled with `[&::-webkit-slider-thumb]` / `[&::-moz-range-thumb]`; height matches `size`
- `date` / `time` / `datetime-local`: calendar icon tinted `muted-foreground`, `color-scheme` follows the theme mode
- `number`: native spinners hidden (NumberInput in card 5 replaces them)
- `search`: native cancel button hidden (InputGroup clear button replaces it)

States: `disabled`, `readOnly` (muted background, no focus ring change), `aria-invalid` (destructive border + ring), all with the S0002 hover tokens.

`Textarea` gets the same `variant` and `size` (min-heights).

## `Field` additions

| Prop / part | Purpose |
|-------------|---------|
| `labelAside?: ReactNode` | Content at the end of the label row in `top` layout: a link ("Forgot password?"), a `Tooltip` info icon, or a `Badge`. Ignored in `floating` / `inline` |
| `optional?: boolean` | Shows a muted "(optional)" after the label. Mutually exclusive with `required` in practice; if both are set, `required` wins |
| `orientation?: "vertical" | "horizontal"` | `horizontal` puts label + description in a left column (`labelWidth`, default `12rem`) and the control + error on the right. Collapses to vertical below `sm` with a container query |
| `error?: ReactNode | ReactNode[]` | An array renders a `<ul>` of messages, each with a small icon; still one `role="alert"` region |
| `FieldCounter` | `<FieldCounter max={160} />` inside `Field` reads the control's length from context (Field tracks `length` alongside `filled`). Text `12 / 160`; turns `warning` at 90%, `destructive` over `max` and sets the field invalid. `aria-live="polite"` only when within 10% of `max` |
| `size` | Passes `sm` / `md` / `lg` to `FieldInput` heights |

Context change: `setFilled(filled)` becomes `setValueLength(n)`; `filled` derives from `n > 0`.

## Docs pages and categories

`components/input.mdx`:

1. **Basics** — default · with `Label` · disabled · read-only
2. **Sizes and variants** — three sizes · four variants · pill
3. **Native types** — password · email · tel · url · number · date · time · file · color (with hex readout) · range (with `<output>`)
4. **States and validation** — invalid with `aria-invalid` · required
5. **When to use what** — short table: plain `Input` vs `Field` vs `InputGroup` vs specialized inputs

`components/field.mdx` (existing page, add categories):

1. **Layouts** — top · floating · inline (existing)
2. **Label extras** — `labelAside` link · tooltip · badge · `optional`
3. **Orientation** — horizontal settings rows
4. **Helpers and errors** — description · `FieldCounter` · multiple errors
5. **Groups** — `FieldSet` with legend (from card 2)

## Tasks

- [x] `inputVariants` CVA with `size`, `variant`, `shape`; native type styles; `Textarea` variants
- [x] Field: `labelAside`, `optional`, `orientation`, array `error`, `size`, `FieldCounter`, value length in context
- [x] Tests: variants render classes; `FieldCounter` updates and flips invalid past `max`; array error renders a list inside one alert; horizontal orientation keeps `htmlFor` / `aria-describedby`
- [x] Stories: Input variants matrix, native types, Field label extras, horizontal settings
- [x] Demos + MDX categories above

## Done when

Every Input / Field row marked **Build** in the inventory renders on the two pages, in light and dark, with correct label and description wiring.
