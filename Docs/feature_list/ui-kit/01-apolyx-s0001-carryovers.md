---
title: "Apolyx-S0001 carry-overs"
description: "Out-of-scope and deferred items after closing sprint Apolyx-S0001 — next feature/plan seeds"
created: 2026-10-11
updated: 2026-10-11
tags:
  - Apolyx-S0002
  - feature
  - ui-kit
  - apolyx
  - Apolyx-S0001
  - carryover
---

# Apolyx-S0001 carry-overs

> Who: planning the next Apolyx sprint. Sprint **Apolyx-S0001** closed with v1 infra shipped; these items were explicitly deferred (see plan [[../../plan/ui-kit/Apolyx-S0001/10-verify-and-handoff]]).

| Item | Notes |
|------|-------|
| Remote registry fetch | CLI already accepts `https://` sources; host + auth + CDN not built |
| `apolyx diff` / `update` | Re-pull upstream changes into an owned copy |
| npm publish of `apolyx` | Package is private; docs note local `node …/dist/index.js` until publish |
| Docs search | Header search control is a disabled placeholder |
| Submenus | DropdownMenu v1 has no submenu |
| Blocks / recipes | Multi-file installable patterns beyond single components |
| Candlestick / canvas OHLC | Trading density; stay on SVG + visx for line/bar |
| Lighthouse / Storybook a11y addon gate | Manual in S0001; automate in CI later |
| Component prefix `Ap*` | Optional branding; not applied in S0001 exports |

Promote individual rows into a plan when pickup starts. Intent umbrella: [[00-intent]].

**After Apolyx-S0002 (2026-10-11):** none of these rows were picked up — S0002 covered new scope instead ([[02-apolyx-s0002-wave]]). S0002 adds its own deferrals: data grid engine (sort / filter / virtualize), Command palette, Popover, Select / Combobox, Accordion, Pagination.
