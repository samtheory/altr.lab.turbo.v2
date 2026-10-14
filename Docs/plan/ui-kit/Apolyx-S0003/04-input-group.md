---
title: "Phase 4 — Input group"
description: "Shared ControlBox for Field and InputGroup; InputGroup compound with inline and block addons, text, buttons, input and textarea"
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

# Phase 4 — Input group

> Who: apollo. Put icons, text, buttons and toolbars inside one input border. Foundation for cards 5–7.

Sprint index: [[README]] · Inventory: [[../../../feature_list/ui-kit/04-apolyx-s0003-switch-inputs#Input group]]

## Step 1 — extract `ControlBox`

Move the bordered box classes out of `Field` into an internal `src/components/ui/control-box.tsx`:

- border, `bg-background`, `shadow-sm`, hover `border-border-strong`, `focus-within` ring, bottom accent bar, `data-[invalid]`, `data-[disabled]`
- `variant` and `shape` from card 3 (`outline` · `filled` · `underline` · `ghost`; `pill`)
- `size` (`sm` · `md` · `lg`) as a data attribute children read for heights

`Field` renders `ControlBox`; behaviour and classes must stay identical (existing Field tests are the guard).

## Step 2 — `InputGroup` compound (`src/components/ui/input-group.tsx`)

```tsx
<InputGroup variant="outline" size="md">
  <InputGroupAddon align="inline-start"><Search /></InputGroupAddon>
  <InputGroupInput placeholder="Search docs" />
  <InputGroupAddon align="inline-end"><Kbd>⌘K</Kbd></InputGroupAddon>
</InputGroup>
```

| Part | Notes |
|------|-------|
| `InputGroup` | `ControlBox` with `role="group"`; sets `data-invalid` when any child control has `aria-invalid` (`has-[[aria-invalid=true]]:`) |
| `InputGroupAddon` | `align`: `inline-start` · `inline-end` · `block-start` · `block-end`. Inline: flex row item, `text-muted-foreground`, icons `size-4`. Block: full-width row above / below the control (toolbar), `border-b` / `border-t` only when `divided` is set. Clicking empty addon space focuses the control |
| `InputGroupText` | Static prefix / suffix text (`https://`, `USD`, `kg`); `select-none` |
| `InputGroupButton` | `Button` preset: `size` `xs` (h-7) / `icon-xs` (size-7), sizes that **Button does not have yet** (it has `sm` · `default` · `lg` · `icon`), so add them to `buttonVariants` first; `variant="ghost"` default, `type="button"` default (pass `type="submit"` to submit). Requires `aria-label` when icon-only (dev warning) |
| `InputGroupInput` | Borderless input that fills the row. Uses Field context when inside `Field` (id, `aria-describedby`, invalid, required), otherwise its own id |
| `InputGroupTextarea` | Borderless auto-growing textarea (`field-sizing: content` with `min-h` / `max-h` fallback) |

Field integration: addons are valid children of `Field` too, because both render `ControlBox`:

```tsx
<Field label="Website" description="Your public site.">
  <InputGroupText>https://</InputGroupText>
  <InputGroupInput />
</Field>
```

Floating labels with an `inline-start` addon offset the label start position by the addon width (CSS var set by the addon).

## Docs page — `components/input-group.mdx` categories

1. **Addons** — icon start · icon end · both · text prefix · text suffix · both
2. **Actions** — text button · icon button with tooltip · multiple end buttons · copy to clipboard (icon swaps to check) · clear button (shows only when filled) · `DropdownMenu` trigger (method / category / visibility) · `Kbd` shortcut
3. **Status** — loading spinner · success check · results count · invalid · disabled
4. **Block addons and textarea** — block-start label row · textarea with character limit · comment box with actions · AI prompt composer with toolbar (attach, model menu, send) · pill prompt bar
5. **With Field** — labelled group with description and error
6. **Real-world** — API request (method menu + URL + Send) · share link (visibility menu + URL + copy) · order search with status filter · member row (avatar + email + role menu)

## Tasks

- [x] Extract `ControlBox`; Field unchanged visually (screenshot compare against S0002 Field demo)
- [x] `InputGroup`, `InputGroupAddon`, `InputGroupText`, `InputGroupButton`, `InputGroupInput`, `InputGroupTextarea`
- [x] Tests: addon click focuses input; invalid child marks group; inside `Field` the input gets Field's id and `aria-describedby`; icon-only button without `aria-label` warns in dev; `type` defaults to `button`
- [x] Stories: Addons, Actions, Status, Composer
- [x] Demos + MDX categories above; registry `input-group.json` (registryDeps: `utils`, `button`, `field`)

## Done when

All six categories render; every Input-group row marked **Build** or **Recipe** in the inventory has a demo; Field demos from S0002 look the same as before.
