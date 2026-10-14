---
title: "Apolyx primitives + wave 1 (as-built)"
description: "Headless primitives without Radix; wave-1 components and Vitest — Apolyx-S0001"
created: 2026-10-11
updated: 2026-10-14
tags:
  - tech-space
  - ui-kit
  - apolyx
  - primitives
  - Apolyx-S0001
---

# Apolyx primitives + wave 1 (as-built)

> Sprint **Apolyx-S0001**. Zero `@radix-ui` / `@base-ui` in the kit.

## Primitives (`src/primitives/`)

Slot, composeRefs, useControllableState, useId, Portal, Presence, FocusScope, DismissableLayer (nested Escape via unshift stack), RovingFocus, scroll-lock, VisuallyHidden, `computePosition`.

Vitest + Testing Library + jsdom; turbo `test` task. Export path: `@altr/apolyx/primitives`.

## Wave 1 (`src/components/ui/`)

Button (loading, asChild via Apolyx Slot), Text/Heading, Label, Input, Textarea, Checkbox, Switch, Card, Badge (+ success/warning/info), Avatar, Separator, Spinner, Skeleton, Alert, Kbd.

Also started wave 1b: **Dialog**, **Tabs**.

Added after the sprint: **Timeline** (2026-10-14) — see [[07-timeline]].

Stories under Foundations (Tokens, Overview) and UI/*. Hub `/docs-preview` smokes wave-1 controls + theme family switcher.
