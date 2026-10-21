---
title: "Apolyx-S0001 carry-overs"
description: "Deferred Apolyx items after S0001–S0005 — seeds for later waves"
created: 2026-10-11
updated: 2026-10-21
tags:
  - feature
  - ui-kit
  - apolyx
  - Apolyx-S0001
  - Apolyx-S0005
  - carryover
---

# Apolyx carry-overs

> Who: planning the next Apolyx sprint after **Apolyx-S0005** closed. Intent umbrella: [[00-intent]].

## Infra / publish (open since S0001)

| Item | Notes |
|------|-------|
| Remote registry fetch | CLI accepts `https://` sources; host + auth + CDN not built |
| `apolyx diff` / `update` | Re-pull upstream changes into an owned copy |
| npm publish of `apolyx` | Package is private |
| Docs search | Header search control is a disabled placeholder |
| Submenus | DropdownMenu v1 has no submenu |
| Blocks / recipes | Multi-file installable patterns beyond single components |
| Candlestick / canvas OHLC | Trading density; stay on SVG + visx for line/bar |
| Lighthouse / Storybook a11y CI | Manual today; automate later |
| Component prefix `Ap*` | Optional branding; not applied |

## Closed into sprints

| Sprint | Picked up |
|--------|-----------|
| S0004 | Popover — [[05-apolyx-s0004-popover]] · [[../../tech_space/ui-kit/09-s0004-popover]] |
| **S0005 (closed 2026-10-21)** | Select, Combobox, Pagination, Accordion (+ Collapsible), Scroll Area, Progress, Radio Group — [[06-apolyx-s0005-product-gate]] · [[../../tech_space/ui-kit/10-s0005-product-gate]] |

## Still deferred (S0006+ — do not block Jord-S0001)

| Item | Notes |
|------|-------|
| International phone input | Combobox country picker now unblocked |
| Date and color pickers | Popover exists; Calendar / pickers not started |
| Slider | Native range stays styled; real dual-thumb Slider later |
| Tags / chips, file dropzone, rich text | Deferred |
| React Hook Form / Zod adapter | No package |
| `<form action>` + `useFormStatus` recipes | React 19 form reset desync |
| Data grid engine, Command palette | Artemis / Studio density |
| Dropdown submenus, candlestick, remote registry | Deferred |

**Next lab implement track:** [[../../plan/Jord/Jord-S0001/README]] (not another Apolyx sprint unless a missing control blocks an app — see `.cursor/rules/apolyx-first.mdc`).
