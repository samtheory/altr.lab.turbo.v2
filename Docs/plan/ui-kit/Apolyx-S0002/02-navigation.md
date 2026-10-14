---
title: "Phase 2 — navigation"
description: "Sheet (left/right/top/bottom drawers), Dialog sizes, Breadcrumb, NavigationMenu, NavList"
created: 2026-10-11
updated: 2026-10-11
tags:
  - plan
  - ui-kit
  - apolyx
  - navigation
  - Apolyx-S0002
---

# Phase 2 — navigation

> Who: apollo. Built only from S0001 primitives; if a primitive lacks a feature, fix the primitive.

Sprint index: [[README]]

| Component | Parts | Built from | ARIA / keys |
|-----------|-------|-----------|-------------|
| Sheet | `Sheet`, `SheetTrigger`, `SheetContent` (`side`), `SheetHeader`, `SheetTitle`, `SheetDescription`, `SheetFooter`, `SheetClose` | Portal, Presence, FocusScope, DismissableLayer, ScrollLock, Motion | Dialog (modal) pattern; slides in from its side; Esc / outside click closes |
| Dialog (modal) | existing parts + `size` on `DialogContent`: `sm` / `md` / `lg` / `xl` / `full` | — | unchanged |
| Breadcrumb | `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink` (`asChild`), `BreadcrumbPage`, `BreadcrumbSeparator`, `BreadcrumbEllipsis` | Slot | `nav[aria-label=breadcrumb]`, `aria-current="page"` |
| NavigationMenu | `NavigationMenu`, `NavigationMenuList`, `NavigationMenuItem`, `NavigationMenuTrigger`, `NavigationMenuContent`, `NavigationMenuLink` | DismissableLayer, Presence, Motion | Disclosure nav: trigger `aria-expanded`, hover-intent + click open, Esc closes, Left/Right moves between top-level items |
| NavList | `NavList`, `NavListGroup`, `NavListLabel`, `NavListItem` (`active`, `asChild`, icon slot) | Slot | `nav` + list; `aria-current="page"` on active |

## Tasks

- [x] Sheet + tests (open, Esc, focus return, side classes)
- [x] Dialog `size`
- [x] Breadcrumb
- [x] NavigationMenu + test (open/close, Esc)
- [x] NavList
- [x] Stories: app shell with left Sheet sidebar + NavList + Breadcrumb + NavigationMenu

## Done when

A full app shell (top nav, breadcrumb, collapsible side drawer) can be composed only from Apolyx parts.
