---
title: "Apolyx-S0012-01 — Pattern backgrounds"
description: "Ship PatternDots through PatternDither + ParticleField"
created: 2026-11-25
updated: 2026-11-25
tags:
  - plan
  - ui-kit
  - apolyx
  - Apolyx-S0012
  - task
---

# Apolyx-S0012-01 — Pattern backgrounds

> **Status:** done  
> **Phase:** [[README]] · Parent feature: [[../../../feature_list/ui-kit/13-apolyx-s0012-magicui-wave|apolyx-F0015]]

## Routing

| | |
|--|--|
| **Parent feature** | `apolyx-F0015` |
| **Suggested agent** | apollo |
| **Est. time** | 90–120 min |

## Goal

Reusable background layers: dots, hex, stripes, retro/pulse/flicker grids, ripple, light rays, dither, particle field.

## In scope

- `PatternDots`, `PatternHex`, `PatternStripes`, `PatternRetroGrid`, `PatternPulseGrid`, `PatternFlickerGrid`, `PatternRipple`, `PatternLightRays`, `PatternDither`, `ParticleField`
- Export, registry JSON, MDX, demo, docs-config `new`

## Proof

- `pnpm --filter @altr/apolyx exec tsc --noEmit` (or kit test script if present)