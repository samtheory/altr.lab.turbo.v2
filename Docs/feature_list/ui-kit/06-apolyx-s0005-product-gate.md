---
title: "Apolyx-S0005 wave — product gate (Select, Combobox, data chrome)"
description: "Intent for the fifth Apolyx wave: listbox Select / Combobox, Pagination, Accordion, Scroll Area, Progress, Radio Group — gate Jord Studio S1 and Artemis shell"
created: 2026-10-21
updated: 2026-10-21
tags:
  - feature
  - ui-kit
  - apolyx
  - Apolyx-S0005
  - select
  - combobox
  - jord
  - artemis
---

# Apolyx-S0005 wave — product gate

> Who: anyone deciding what Apolyx ships **before** Jord Studio and Artemis UI work. This is **intent** (acceptance ticked 2026-10-21). Sprint cards: [[../../plan/ui-kit/Apolyx-S0005/README]] · As-built: [[../../tech_space/ui-kit/10-s0005-product-gate]]. Umbrella: [[00-intent]] · Carry-overs: [[01-apolyx-s0001-carryovers]] · Roadmap: [[../../plan/00-roadmap-apolyx-jord-artemis]].

Constraints carry over unchanged: **no Radix / Base UI**, semantic tokens only, 3 families × light / dark, reduced motion respected, every component ships Storybook + MDX + registry, no new runtime dependencies.

## Why this wave now

Big picture for the lab: **finish Apolyx (this gate) → implement Jord → plan and build Artemis**.

| Downstream | Needs from Apolyx |
|------------|-------------------|
| **Jord Slice 0** (`elements/jord`, `cloud/jord`) | **None.** Engine-only; no UI kit dependency. |
| **Jord Studio S1** (table list + `records` row browser) | Select / Combobox, Pagination, Scroll Area, Progress, Accordion, Radio Group — **shipped**. |
| **Artemis phase 1 shell** | Same listbox family + charts; Command / candlestick still later. |

Reference catalog: [Shadcn Studio Components](https://shadcnstudio.com/components). Studio is visual / recipe reference only.

## What we build

### 1. Select (listbox)

Owned parts: `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`, `SelectGroup`, `SelectLabel`, `SelectSeparator`.

### 2. Combobox (searchable select)

One Combobox API + empty state; Autocomplete kinds are docs recipes.

### 3. Pagination

Compositional chrome + `getPaginationRange`.

### 4. Accordion (+ Collapsible)

Single / multiple Accordion and Collapsible.

### 5. Scroll Area

Owned CSS scrollport.

### 6. Progress

Determinate + indeterminate.

### 7. Radio Group

`RadioGroup` + `RadioGroupItem` with Field wiring.

## Out of scope (this wave)

- Data grid engine, Command, Slider, date / color pickers, tags, dropzone, rich text
- RHF / Zod adapter, remote registry, submenus, candlestick
- Jord Studio / Artemis apps

## Acceptance

- [x] Select + Combobox ship with WAI-ARIA listbox behavior, Field integration, Storybook, MDX, registry entries, Vitest
- [x] Pagination, Accordion, Scroll Area, Progress, Radio Group ship the same way
- [x] Docs recipes / demos without forking Studio source
- [x] Zero Radix / Base UI deps; typecheck + kit tests + docs `tsc` green
- [x] Carry-overs note updated; tech_space + STATUS + brain refreshed on close (docs_man)

## Links

- Plan: [[../../plan/ui-kit/Apolyx-S0005/README]]
- As-built: [[../../tech_space/ui-kit/10-s0005-product-gate]]
- Roadmap: [[../../plan/00-roadmap-apolyx-jord-artemis]]
- Next implement: [[../../plan/Jord/Jord-S0001/README]]
- Reference: https://shadcnstudio.com/components
