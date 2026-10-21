---
title: "Phase 5 — Docs, registry, verify"
description: "MDX pages, registry build, tests, typecheck, screenshots for Apolyx-S0005"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - ui-kit
  - apolyx
  - docs
  - Apolyx-S0005
---

# Phase 5 — Docs, registry, verify

> Who: apollo. Closes the engineering loop before docs_man handoff.

Sprint index: [[README]]

## Tasks

1. Finish MDX for Select, Combobox, Pagination, Scroll Area, Progress, Accordion, Radio Group under Forms / Components as appropriate (mirror sidebar grouping conventions).
2. Registry build includes every new item; CLI `apolyx add` smoke for `select` and `combobox` at minimum.
3. Forms / data recipes: one Studio-style filter bar using Select + Combobox + Pagination on Table.
4. Screenshots light + dark → `Docs/report/assets/apolyx-s0005/`.
5. Run kit `test` / `typecheck` / registry `build`; docs `tsc`.

## Done when

- [ ] All new MDX pages linked in docs sidebar
- [ ] Registry count documented in sprint README
- [ ] Screenshots saved
- [ ] CI-equivalent local commands green
