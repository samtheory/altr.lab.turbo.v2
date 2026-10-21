---
title: "Phase 4 — Accordion and Radio Group"
description: "Accordion disclosures and Radio Group form control"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - ui-kit
  - apolyx
  - accordion
  - radio
  - Apolyx-S0005
---

# Phase 4 — Accordion and Radio Group

> Who: apollo. Reference: [Accordion](https://shadcnstudio.com/components) and Radio Group on Shadcn Studio.

Sprint index: [[README]] · Intent: [[../../../feature_list/ui-kit/06-apolyx-s0005-product-gate]]

## Accordion

- `type="single" | "multiple"`, collapsible single
- Parts: `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent`
- Motion: height / opacity via existing Presence + reduced-motion fade
- Add `Collapsible` only if a standalone one-panel API is cleaner than a one-item Accordion

## Radio Group

- `RadioGroup` + `RadioGroupItem` with Field / Label wiring
- Roving tabindex; arrow keys; `disabled` on group and item
- Semantic checked styles matching Checkbox / Switch tokens

## Done when

- [ ] Registry `accordion` (+ `collapsible` if added), `radio-group`
- [ ] Vitest keyboard + controlled open / value
- [ ] Stories + MDX stubs
