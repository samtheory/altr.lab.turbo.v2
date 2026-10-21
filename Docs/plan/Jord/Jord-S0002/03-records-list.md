---
title: "Phase 3 — records list"
description: "Bucket filter and Apolyx table listing records newest first"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - jord
  - Jord-S0002
---

# Phase 3 — records list

> Who: **apollo**. Read-only browse first; mutations are card 4.

Sprint index: [[README]]

## UI

- Bucket control (Select or Combobox from Apolyx) — default bucket `lab`
- Table columns at least: `id`, `bucket`, `version`, `updated_at`, short `body` preview
- Newest first (server already orders)
- Empty and error states (server down vs empty bucket)
- Row click → detail route or panel (wired in card 4 if needed)

## Status

**done** (2026-10-21)

## Tasks

- [x] Records list page composing Apolyx Table / Scroll Area (and Pagination only if the list is long enough to need it)
- [x] Fetch via `/api/records?bucket=`

## Done when

With a seeded row in bucket `lab`, Studio shows that row without inventing a local table component.
