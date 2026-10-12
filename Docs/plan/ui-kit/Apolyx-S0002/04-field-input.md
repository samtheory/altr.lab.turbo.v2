---
title: "Phase 4 — Field and Input"
description: "Field compound with top / floating / inline label layouts and smooth focus motion"
created: 2026-10-11
updated: 2026-10-11
tags:
  - plan
  - ui-kit
  - apolyx
  - forms
  - Apolyx-S0002
---

# Phase 4 — Field and Input

> Who: apollo. `Input` stays a plain styled `<input>`; layouts move into `Field`.

Sprint index: [[README]]

## API

```tsx
<Field label="Email" layout="top" description="We never share it" error={err}>
  <FieldInput type="email" />
</Field>
```

| `layout` | Look |
|----------|------|
| `top` | Label above the control |
| `floating` | Label sits inside; on focus or when filled it shrinks and moves onto the top border (notched) |
| `inline` | Label and control side-by-side inside one bordered box; label on a muted background separated by a divider |

Parts: `Field`, `FieldLabel`, `FieldControl` (layout wrapper), `FieldInput`, `FieldTextarea`, `FieldDescription`, `FieldError`. Context wires `id`, `aria-describedby`, `aria-invalid`.

## Motion

- Focus: border color → `--ring`, soft ring grows in, label tints to `--primary` (CSS transitions on `--duration-*` tokens).
- Defocus: reverse, slightly slower.
- Floating label: transform `translateY` + `scale`, driven by `:focus-within` / `data-filled`.
- Reduced motion: transitions off.

## Tasks

- [x] `field.tsx` with context + layouts
- [x] Input polish: hover border, focus transition
- [x] Tests: label association, describedby, filled state
- [x] Stories for all three layouts + error + disabled

## Done when

All three layouts work with keyboard and screen readers and animate smoothly.
