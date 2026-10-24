---
title: "Roadmap — Apolyx → Jord → Artemis"
description: "Sequencing plan: Apolyx + Jord S1–S8 done; Artemis next product gate"
created: 2026-10-21
updated: 2026-10-24
tags:
  - plan
  - roadmap
  - apolyx
  - jord
  - artemis
  - Jord-S0006
  - Jord-S0008
  - Jord-S0009
---

# Roadmap — Apolyx → Jord → Artemis

> Who: anyone picking the next lab track. This is the **current** big-picture sequence (updated 2026-10-23). Living map: [[../brain/00-Docs-Brain]] · Status: [[../report/STATUS]].

## Sequence

```mermaid
flowchart LR
  A5[Apolyx-S0005 product gate] --> J0[Jord-S0001 Slice 0 engine]
  J0 --> JS1[Jord Studio S1–S3]
  JS1 --> JS4[Jord Studio S4 done]
  JS4 --> JS5[Jord Studio S5 done]
  JS5 --> JS6[Jord Studio S6 done]
  JS6 --> JS7[Jord Studio S7 done]
  JS7 --> JS8[Jord Studio S8 done]
  JS8 --> Art[Artemis sharpen → feature_list → plan → build]
```

| Order | Track | What “done” means | Docs |
|-------|--------|-------------------|------|
| **1** | **Apolyx-S0005** | Select, Combobox, Pagination, Accordion, Scroll Area, Progress, Radio Group shipped | **Closed 2026-10-21** — [[../feature_list/ui-kit/06-apolyx-s0005-product-gate]] · [[../tech_space/ui-kit/10-s0005-product-gate]] |
| **2** | **Jord-S0001** | `data/jord.db`, `@altr/jord`, `@altr/jord-server`, OCC `records`, WAL + snapshot | **Closed 2026-10-21** — [[../tech_space/jord/00-s0001-slice0]] · Plan [[Jord/Jord-S0001/README]] |
| **3** | **Jord Studio S1** (`Jord-S0002`) | `apps/jord-studio` lists / browses / mutates `records` via server; UI by **apollo** | **Closed 2026-10-21** — [[../tech_space/jord/01-s0002-studio-s1]] · Plan [[Jord/Jord-S0002/README]] |
| **3b** | **Jord Studio S1.5** (`Jord-S0003`) | Categorized side nav + Supabase-like SQL Insert/edit for `records` | **Closed 2026-10-21** — [[../tech_space/jord/02-s0003-studio-shell]] · Plan [[Jord/Jord-S0003/README]] |
| **3c** | **Jord Studio S2** (`Jord-S0004`) | Schema introspect + visualizer + additive `ADD COLUMN` live save | **Closed 2026-10-21** — [[../tech_space/jord/03-s0004-schema]] · Plan [[Jord/Jord-S0004/README]] |
| **3d** | **Jord Studio S3** (`Jord-S0005`) | Auth sessions + feature roles (`admin` / `editor` / `readonly`); protect jord-server | **Closed 2026-10-21** — [[../tech_space/jord/04-s0005-auth]] · Plan [[Jord/Jord-S0005/README]] |
| **3e** | **Jord Studio S4** (`Jord-S0006`) | Generated CRUD API catalog + Studio inspect/toggle panel (+ `records` DELETE) | **Closed 2026-10-21** — [[../tech_space/jord/05-s0006-generated-api]] · Plan [[Jord/Jord-S0006/README]] |
| **3f** | **Jord Studio S5** (`Jord-S0007`) | In-process jobs / interval schedules + log ring + Studio Runtime panels | **Closed 2026-10-21** — [[../tech_space/jord/06-s0007-jobs-logs]] · Plan [[Jord/Jord-S0007/README]] |
| **3g** | **Jord Studio S6** (`Jord-S0008`) | Custom APIs + function APIs (built-in steps, `/x/:slug`) | **Closed 2026-10-21** — [[../tech_space/jord/07-s0008-custom-function-apis]] · Plan [[Jord/Jord-S0008/README]] |
| **3h** | **Jord Studio S7** (`Jord-S0009`) | Policies (server middleware) + AFTER write triggers; Studio Database panels | **Closed 2026-10-23** — [[../tech_space/jord/08-s0009-triggers-policies]] · Plan [[Jord/Jord-S0009/README]] |
| **3i** | **Jord Studio S8** (`Jord-S0010`) | `PostgresAdapter` for `postgres://` / `postgresql://`; `file:` stays the default; Studio shows dialect | **Closed 2026-10-24** — [[../tech_space/jord/09-s0010-postgres]] · Plan [[Jord/Jord-S0010/README]] |
| **4** | **Artemis** | Sharpen idea → promote `feature_list/artemis/` → plan → terminal shell | **← next product gate** · Idea [[../idea/artemis/README]] |

## Why Apolyx before Jord engine?

**Code coupling:** Jord Slice 0 needs **zero** Apolyx. The engine is `elements/jord` + `cloud/jord` only.

**Product coupling:** Jord Studio and Artemis both consume `@altr/apolyx`. Shipping the **product gate** first avoids building Studio / terminal screens on missing Select / Combobox / Pagination / Scroll Area, then ripping them up.

Apolyx gate and Jord-S0001–**S0010** are closed. **Next product gate:** Artemis. Optional Jord Studio S9+ when mimir opens a plan. Product apps stay Apolyx-first (`.cursor/rules/apolyx-first.mdc`).

## Apolyx after S0005 (not blocking Jord)

Still open in [[../feature_list/ui-kit/01-apolyx-s0001-carryovers]] for later waves (S0006+):

- Command palette, data-grid engine, Slider, date / color pickers
- Dropdown submenus, phone input, RHF / Zod adapter
- Candlestick (Artemis density), remote registry / CLI update / npm publish

## Artemis gate

Do **not** open `feature_list/artemis/` until:

1. Apolyx-S0005 closed (or explicitly waived for a paper shell)
2. Jord-S0001 closed (scratchpad + server for paper / agent notes)
3. Idea sharpening note answers the four open questions in [[../idea/artemis/README]]

## Out of this roadmap

- Tia (promoted intent only — separate track)
- Life systems, API client, Search
- Apolyx Token Studio / premium themes (still idea)

## Links

- Apolyx track: [[ui-kit/README]]
- Jord track: [[Jord/README]]
- Catalog: [[../idea/2026-10-18-product-catalog]]
