---
title: "Phase 1 — categorized Studio side nav"
description: "App shell with left nav grouped by Data / Runtime / APIs / Database / Help"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - jord
  - Jord-S0003
---

# Phase 1 — categorized Studio side nav

> Who: **apollo**. Empty chrome structure; live links only for what S1 already ships.

Sprint index: [[README]] · Intent surfaces: [[../../../feature_list/Jord/03-jord-studio]]

## UI

- Persistent left side menu (desktop); collapse or sheet pattern on narrow viewports using Apolyx only
- Product name **Jord Studio** remains in chrome (header or nav top)
- Keep the local-dev banner from S1
- Groups and items per [[README#Plan-level decisions]]
- Live: Data → Tables (`/records`), Insert (`/records/new` or insert panel)
- Placeholders: `aria-disabled` or “Coming” badge — do not fake working Jobs/Auth screens

## Status

**done** (2026-10-21)

## Tasks

- [x] Studio layout shell (side nav + main) composing Apolyx
- [x] Nav config module (groups, hrefs, live vs soon labels) — single source for menu
- [x] Wire existing home / records / new routes into the shell

## Done when

Cold open shows categorized nav; Data items navigate; later categories are visible but clearly not implemented.

