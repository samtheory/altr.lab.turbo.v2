---
title: "plan/ui-kit — Apolyx-S0003 sprint"
description: "Sprint Apolyx-S0003: Switch motion fix and Switch family, input catalog (Input variants, Field extras, InputGroup, password, number, OTP, mask), form patterns, Forms docs group"
created: 2026-10-14
updated: 2026-10-14
tags:
  - plan
  - ui-kit
  - apolyx
  - sprint
  - Apolyx-S0003
  - readme
---

# plan / ui-kit — Apolyx-S0003

> Who: **apollo** (executes cards in order) and **docs_man** (closes the sprint). Intent: [[../../../feature_list/ui-kit/04-apolyx-s0003-switch-inputs]]. Previous sprint: [[../Apolyx-S0002/README]].

**Sprint id:** `Apolyx-S0003`  
**Status:** closed — opened and closed 2026-10-14 · **Owner:** apollo · **Docs steward:** docs_man · As built: [[../../../tech_space/ui-kit/08-s0003-switch-inputs]]

## Goal

Make the Switch feel right, give it a family that covers real settings screens, and ship the input catalog people need for sign-in, verification, billing and settings forms.

## Phases

| # | Card | Delivers | Status |
|---|------|----------|--------|
| 1 | [[01-switch-motion]] | Pure physics function; smooth press, capped stretch, no growth past ends or into the current side, progress-tinted track | done |
| 2 | [[02-switch-family]] | `size lg`, `tone`, `icons`, `labels`; `SwitchField`, `SwitchCard`; `FieldSet` / `FieldLegend` | done |
| 3 | [[03-input-and-field]] | `Input` variants / shape / sizes / native types; Field `labelAside`, `optional`, `orientation`, `FieldCounter`, multiple errors | done |
| 4 | [[04-input-group]] | Shared `ControlBox`; `InputGroup`, `InputGroupAddon`, `InputGroupText`, `InputGroupButton`, `InputGroupInput`, `InputGroupTextarea` | done |
| 5 | [[05-password-and-number]] | `PasswordInput`, `PasswordStrength`, `NumberInput` | done |
| 6 | [[06-input-otp]] | `InputOTP`, `InputOTPGroup`, `InputOTPSlot`, `InputOTPSeparator` | done |
| 7 | [[07-input-mask]] | `useMask`, `MaskedInput`, mask presets | done |
| 8 | [[08-form-patterns]] | Docs-only form recipes (no new deps) | done |
| 9 | [[09-docs-registry-verify]] | Forms sidebar group, categorized pages, exports, registry, tests, typecheck, screenshots | done |
| 10 | [[10-docs-man-handoff]] | feature_list ticks + tech_space note + report + brain | done |

Cards 1 and 2 touch only Switch and can ship alone. Cards 5–7 depend on card 4 (they are built on `InputGroup`). Card 8 depends on 2–7.

## Plan-level decisions

1. **No new runtime deps.** OTP and masking are Apolyx-owned (no `input-otp`, no `react-imask`). Icons stay `lucide-react`, already used by the kit.
2. **Physics is a pure function.** Switch geometry moves into `switch-physics.ts` so stretch limits are unit-tested without animating in jsdom.
3. **One control box.** `Field` and `InputGroup` render the same internal `ControlBox` (border, hover, focus ring, accent bar, invalid). Addons work inside both; a labelled input group is just a `Field` with addons.
4. **Explicit components over boolean props.** `SwitchField` and `SwitchCard` are separate components, not `<Switch card description>`. `PasswordInput` and `NumberInput` are explicit, built on `InputGroup`.
5. **Object props for paired content.** `icons={{ checked, unchecked }}` and `labels={{ checked, unchecked }}` instead of four props.
6. **`Input` stays a plain input.** Variants and native type styling go on `Input`; anything with ornaments goes through `InputGroup`.
7. **No Select / Popover this sprint.** Where a reference uses a select inside an input, the demo uses a `DropdownMenu` trigger as an addon.
8. **Forms docs group.** Form controls (Field, Input, Input Group, Password Input, Number Input, Input OTP, Input Mask, Textarea, Checkbox, Switch, Label, Form patterns) move from Components into a new **Forms** sidebar group. Each page is split into categories (H2 sections) listed in its card.
9. **Validation is native.** `aria-invalid` drives red borders everywhere (on `Input`, `InputGroup`, OTP slots, Field); forms use `FormData` and React 19 actions in recipes.

## Counts at close

| What | Before | Estimate | Actual (2026-10-14) |
|------|--------|----------|--------|
| Registry items | 60 | ~65 | **66** (the extra one is the `mask` lib item) |
| Docs MDX pages | 42 | ~48 | **48** |
| Vitest tests | 59 | ~95 | **141** (30 files) |

## Definition of done (sprint)

- Every card's "Done when" holds.
- `pnpm --filter @altr/apolyx test`, `typecheck`, `build` (registry) green; `tsc` clean in `apps/apolyx`.
- Light / dark screenshots of the Switch page and the Input Group page saved under `Docs/tech_space/ui-kit/assets/apolyx-s0003/`.
- docs_man handoff done (card 10).

## Links

- Track index: [[../README]]
- Intent: [[../../../feature_list/ui-kit/04-apolyx-s0003-switch-inputs]]
- S0002 as-built (Switch and Field we extend): [[../../../tech_space/ui-kit/06-s0002-contrast-nav-switch-field-data]]
- Builder: [[../../../agents/apollo/00-index]]
