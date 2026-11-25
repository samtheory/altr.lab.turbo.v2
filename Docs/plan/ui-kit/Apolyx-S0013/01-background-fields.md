---
title: "Apolyx-S0013-01 — Background fields"
description: "Ship CubeField, HoverBoxes, MeshGradient, WaveField, VortexField, LampGlow, SparkleField, Starfield"
created: 2026-11-25
updated: 2026-11-25
tags:
  - plan
  - ui-kit
  - apolyx
  - Apolyx-S0013
  - task
---

# Apolyx-S0013-01 — Background fields

> **Status:** done  

> **Phase:** [[README]] · Parent feature: [[../../../feature_list/ui-kit/14-apolyx-s0013-aceternity-wave|apolyx-F0016]]

## Routing

| | |
|--|--|
| **Parent feature** | `apolyx-F0016` |
| **Suggested agent** | apollo |
| **Est. time** | 120–180 min |

## Goal

Animated background layers inspired by Aceternity cubes / boxes / gradient / wavy / vortex / lamp / sparkles / stars — Apolyx tokens + reduced-motion.

## In scope

- `CubeField`, `HoverBoxes`, `MeshGradient`, `WaveField`, `VortexField`, `LampGlow`, `SparkleField`, `Starfield` (extend `MeteorShower` where useful)
- Export, registry JSON, MDX, demo, docs-config `new`
- Refs: feature map rows for those Aceternity slugs

## Proof

- Kit typecheck / focused tests if present
- Docs previews show motion; static under `prefers-reduced-motion`
