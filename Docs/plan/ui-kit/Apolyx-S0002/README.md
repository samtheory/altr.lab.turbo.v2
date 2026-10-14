---
title: "plan/ui-kit — Apolyx-S0002 sprint"
description: "Sprint Apolyx-S0002: hover contrast, navigation components, physics Switch, Field layouts, data components, docs handoff"
created: 2026-10-11
updated: 2026-10-11
tags:
  - plan
  - ui-kit
  - apolyx
  - sprint
  - Apolyx-S0002
  - readme
---

# plan / ui-kit — Apolyx-S0002

> Who: **apollo** (executes cards in order) and **docs_man** (closes the sprint). Intent: [[../../../feature_list/ui-kit/00-intent]]. Previous sprint: [[../Apolyx-S0001/README]].

**Sprint id:** `Apolyx-S0002`  
**Status:** closed — opened and closed 2026-10-11 · **Owner:** apollo · **Docs steward:** docs_man

## Goal

Make Apolyx feel finished in dark mode, and fill the biggest catalog gaps users hit first: navigation shells, richer form fields, a tactile Switch, and data display.

## Phases

| # | Card | Delivers | Status |
|---|------|----------|--------|
| 1 | [[01-hover-contrast]] | `--primary-hover` / `--accent-hover` / … tokens; Button + menu + tabs dark contrast | done |
| 2 | [[02-navigation]] | Sheet (left / right / top / bottom), Dialog sizes, Breadcrumb, NavigationMenu, NavList | done |
| 3 | [[03-switch-physics]] | Draggable Switch with stretch + bounce thumb | done |
| 4 | [[04-field-input]] | `Field` compound: top / floating / inline labels, focus motion | done |
| 5 | [[05-data-components]] | Table, List, Grid | done |
| 6 | [[06-docs-registry-verify]] | Exports, registry manifests, MDX pages, tests, typecheck | done |
| 7 | [[07-docs-man-handoff]] | feature_list + tech_space + brain + report | done |

## Plan-level decisions

1. **No new runtime deps.** Everything composes S0001 primitives (`Portal`, `Presence`, `FocusScope`, `DismissableLayer`, `RovingFocus`, `useFloating`) and `motion`.
2. **Hover is a token, not an opacity.** `hover:bg-primary/90` is replaced by `hover:bg-primary-hover` so each theme family × mode chooses a hover color with real contrast.
3. **Sheet, not a separate Sidebar overlay.** Left / right sidebars are `Sheet side="left|right"`; the persistent in-page nav is `NavList`.
4. **Modal = Dialog.** Dialog gains a `size` prop; docs call it out as the modal.
5. **`Input` stays low-level.** Labels, descriptions, errors and layouts live in the new `Field` compound.
6. **Data components are presentational.** No sorting / virtualization engine this sprint.

## Links

- Track index: [[../README]]
- As-built: [[../../../tech_space/ui-kit/06-s0002-contrast-nav-switch-field-data]] · index [[../../../tech_space/ui-kit/README]]
- Intent: [[../../../feature_list/ui-kit/02-apolyx-s0002-wave]]
- Carry-overs from S0001: [[../../../feature_list/ui-kit/01-apolyx-s0001-carryovers]]
