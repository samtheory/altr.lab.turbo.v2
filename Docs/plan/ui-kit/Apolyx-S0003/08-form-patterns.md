---
title: "Phase 8 — Form patterns"
description: "Docs-only form recipes composed from kit parts: layouts, dialog / sheet forms, multi-step, review, error summary, async submit with React 19 actions"
created: 2026-10-14
updated: 2026-10-14
tags:
  - plan
  - ui-kit
  - apolyx
  - forms
  - docs
  - Apolyx-S0003
---

# Phase 8 — Form patterns

> Who: apollo. Show how the pieces combine into real forms. **Docs only**: no new kit component, no form library.

Sprint index: [[README]] · Depends on cards 2–7.

## Rules for every recipe

- Native `<form>`; read values with `FormData`; submit with React 19 `useActionState` and show pending state with `useFormStatus` in the submit `Button` (`Spinner` + disabled).
- Validation in the action returns `{ errors: Record<field, string | string[]> }`; Fields receive `error` from it.
- On a failed submit, focus moves to the first invalid control and an error summary (`Alert` with links to each field id) appears above the form.
- Every control has a visible label; placeholders are hints only.
- Demos live in `apps/apolyx/src/demos/form-*.tsx`; no recipe adds a dependency.

## Page — `forms/patterns.mdx` (title "Form patterns") categories

1. **Layouts**
   - Stacked (sign-up: name, email, `PasswordInput` with strength, terms `Checkbox`)
   - Two-column (profile: first / last name side by side via `Grid`, collapses on mobile)
   - Horizontal labels (settings: `Field orientation="horizontal"` rows with `FieldSet` sections)
   - Inline (newsletter: `InputGroup` email + submit button)
   - Dense (compact sizes `sm` for a filter panel)
2. **Containers**
   - Form in `Dialog` (create project: name, `MaskedInput` key, `NumberInput` seats)
   - Form in `Sheet side="right"` (edit member)
   - Form in `Card` with footer actions
3. **Flows**
   - Multi-step: horizontal `Timeline` as the step indicator (`value` = current step), Back / Next, values kept across steps in one parent state
   - Verification: email → `InputOTP` step
   - Read-only review: the final step shows a `List` of answers with Edit links back to each step
4. **Feedback**
   - Error summary + focus first invalid
   - Async field check (username availability with `InputGroupAddon` spinner → check / x), debounced 300 ms
   - Success: `toast()` and form reset
5. **Settings screen**
   - Full example combining `FieldSet` (framed), `SwitchField`, horizontal `Field`, `NumberInput`, and a sticky Save bar that appears when the form is dirty

## Tasks

- [x] Demo files for each bullet; shared tiny helpers (e.g. `validate.ts`) stay inside `apps/apolyx/src/demos/form-shared.ts`
- [x] MDX page with categories above, an intro explaining the native-form approach, and a note on plugging in React Hook Form / Zod later
- [x] Manual check: keyboard-only completion of the multi-step and error-summary demos

> **Deviation:** demos submit from `onSubmit` through a small `useFormAction` helper (`useActionState` + `startTransition`) instead of `<form action>` + `useFormStatus`. React 19 resets a form after every action, including failed ones, which clears uncontrolled inputs and desyncs the hidden inputs behind the kit's `Checkbox` / `Switch`. Pending state comes from `useActionState`; success resets by remounting the form with a new `key`.

## Done when

Each category renders and submits; failed submits focus the first invalid field; no new package in `apps/apolyx/package.json`.
