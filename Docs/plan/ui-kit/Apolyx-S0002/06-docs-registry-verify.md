---
title: "Phase 6 — docs, registry, verify"
description: "Exports, registry manifests, MDX docs pages, tests and typecheck for S0002 components"
created: 2026-10-11
updated: 2026-10-11
tags:
  - plan
  - ui-kit
  - apolyx
  - registry
  - Apolyx-S0002
---

# Phase 6 — docs, registry, verify

> Who: apollo.

Sprint index: [[README]]

## Tasks

- [x] Export every new part from `src/index.ts`
- [x] Registry manifests: `sheet`, `breadcrumb`, `navigation-menu`, `nav-list`, `field`, `table`, `list`, `grid`; refresh `button`, `switch`, theme items
- [x] `pnpm --filter @altr/apolyx registry:build` (or equivalent) succeeds
- [x] MDX pages in `apps/apolyx/src/content/docs/components/` + docs nav entries
- [x] `pnpm --filter @altr/apolyx test` and `typecheck` green
- [x] `apps/apolyx` typecheck green

## Done when

Every S0002 component is importable, installable via CLI, and documented.
