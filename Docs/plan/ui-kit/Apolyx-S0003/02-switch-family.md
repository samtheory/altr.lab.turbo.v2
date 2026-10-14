---
title: "Phase 2 — Switch family"
description: "Switch lg size, tones, thumb icons, track labels; SwitchField, SwitchCard, FieldSet / FieldLegend; categorized Switch docs page"
created: 2026-10-14
updated: 2026-10-14
tags:
  - plan
  - ui-kit
  - apolyx
  - switch
  - forms
  - Apolyx-S0003
---

# Phase 2 — Switch family

> Who: apollo. Extend `Switch` and add the pieces settings screens need. Depends on [[01-switch-motion]] (the `lg` geometry lives in `switch-physics.ts`).

Sprint index: [[README]] · Inventory: [[../../../feature_list/ui-kit/04-apolyx-s0003-switch-inputs#Switch]]

## Switch API additions

| Prop | Values | Notes |
|------|--------|-------|
| `size` | `sm` · `md` · **`lg`** | `lg`: track `h-7 w-[3.25rem]`, thumb 24 px. Add to `switch-physics.ts` geometry |
| `tone` | `primary` (default) · `success` · `warning` · `info` · `destructive` | Sets `--switch-tone` / `--switch-tone-fg` on the track (same pattern as Timeline's `--tl-tone`). Checked track uses the tone; hover uses `--primary-hover` / `--destructive-hover` where they exist, otherwise `color-mix(in oklch, var(--switch-tone), var(--foreground) 12%)` |
| `icons` | `{ checked?: ReactNode; unchecked?: ReactNode }` | Rendered centered inside the thumb, `size-3` (sm) / `size-3.5` (md) / `size-4` (lg), color `--switch-tone` when checked, `muted-foreground` when not. Cross-fade 120 ms between states |
| `labels` | `{ checked?: ReactNode; unchecked?: ReactNode }` | Short text inside the track on the side opposite the thumb (`text-[10px] font-semibold uppercase`). Track widens to fit: set `min-width` from a CSS var; physics `travel` is read from the measured track width (ResizeObserver) when `labels` is set |

All existing props, data attributes and behaviour stay.

## New components (`src/components/ui/switch-field.tsx`, `field-set.tsx`)

### `SwitchField`

A labelled row: the whole row is the label, so clicking the text toggles.

```tsx
<SwitchField
  label="Airplane mode"
  description="Turns off wireless connections."
  aside={<Badge variant="info">Beta</Badge>}   // optional, after the label text
  side="end"                                     // "end" (default) | "start": where the switch sits
  {...switchProps}                               // checked, defaultChecked, onCheckedChange, size, tone, icons, disabled, name
/>
```

- Renders `<label>` wrapping text + `Switch`; description gets an id and goes into the Switch's `aria-describedby`.
- Hover: row text goes `foreground`; disabled: whole row `opacity-50`, `cursor-not-allowed`.
- `data-state` mirrors the switch so rows can be styled.

### `SwitchCard`

A selectable tile for option grids.

```tsx
<SwitchCard
  icon={<Bell />}
  title="Push notifications"
  description="Get alerts on this device."
  {...switchProps}
/>
```

- Bordered card (`rounded-lg border bg-card p-4`); checked state: `border-(--switch-tone)` + `ring-1 ring-(--switch-tone)/30` + faint tone background (`color-mix` 6%).
- The whole card is the click target (a `<label>`); the `Switch` sits top-right; focus ring is drawn on the card when the switch has `:focus-visible` (`has-[:focus-visible]:ring-2`).
- `tone="destructive"` styles the checked card in destructive colors (used by the confirmation recipe).

### `FieldSet` / `FieldLegend`

```tsx
<FieldSet legend="Notifications" description="Choose what we email you about." variant="plain | framed">
  <SwitchField … />
  <SwitchField … />
</FieldSet>
```

- Native `<fieldset>` + `<legend>`; `disabled` on the fieldset disables every control inside (native behaviour).
- `variant="framed"`: bordered, rounded, rows separated by `divide-y`; `plain`: stacked with `gap-3`.
- Also used by card 3 (field groups) and card 8 (form sections). Export from `field.tsx`'s module or its own file; one registry item `field` covers it.

## Docs page — `components/switch.mdx` categories

Each H2 is a category; each bullet is a `ComponentPreview` with its own demo file `src/demos/switch-<name>-demo.tsx`.

1. **Basics** — default · with label (`Label htmlFor`) · `SwitchField` with description · disabled (off and on) · controlled with state readout · inside a `<form>` with `name` (shows submitted `FormData`)
2. **Appearance** — sizes `sm` / `md` / `lg` · tones (five, all checked) · thumb icons (sun / moon, check / x) · track labels (ON / OFF) · label side `start` / `end`
3. **Composition** — `SwitchField` with tooltip info icon · with badges (Beta, Pro) · with icon tile (leading rounded square icon) · `SwitchCard` single
4. **Settings layouts** — `FieldSet` group (plain) · framed list with separators · card list with icons (`Card` + `List`) · compact settings table (`Table`, switch in last column) · `SwitchCard` grid (`Grid minItemWidth`)
5. **Confirmation** — destructive switch that reveals an `Alert` ("This deletes local data") when on · controlled switch that opens a `Dialog`; `onCheckedChange` only commits after Confirm

Below the categories: **Physics** (link to the motion rules), **Accessibility**, **Props** (Switch, SwitchField, SwitchCard, FieldSet).

## Tasks

- [x] `lg` geometry + `tone`, `icons`, `labels` on `Switch`
- [x] `SwitchField`, `SwitchCard`, `FieldSet` / `FieldLegend`
- [x] Tests: `SwitchField` label click toggles once and wires `aria-describedby`; `SwitchCard` card click toggles; `FieldSet disabled` disables inner switches; `tone` sets data attribute; `icons` swap by state
- [x] Stories: Tones, Icons, Labels, SwitchField, SwitchCard grid, Settings panel
- [x] Demos + MDX categories above
- [x] Registry: `switch.json` adds `switch-physics.ts`, `switch-field.tsx`; registryDeps `field` (for FieldSet), `badge`/`tooltip` not required (demos only)

## Done when

The five categories render in all three theme families × light / dark; each example works by mouse, keyboard and screen reader name; no category needs a component outside the kit.
