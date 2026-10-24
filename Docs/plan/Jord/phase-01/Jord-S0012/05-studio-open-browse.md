---
title: "Phase 5 — Studio open / browse tables"
description: "Table picker + generic row browser; keep records special-case"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0012
  - apollo
  - jord-studio
---

# Phase 5 — Studio open / browse tables

> Who: **mimir → apollo**. Contract: [[01-contract]].

Sprint index: [[README]]

## Status

**done** (2026-10-24)

## Goal

Operator can **open** a non-`records` table and see rows — not only filter buckets on `records`.

## Work

1. Nav: rename **Tables · records** → **Tables**; entry lists / selects tables from schema API
2. Route shape (pick one, document in as-built):
   - `/tables` + `/tables/[name]` for generic browse, keep `/records` for OCC editor, **or**
   - `/tables/[name]` with redirect when `name === "records"` to existing records UX
3. Generic browse: column headers from `describeTable`, rows from rows API, empty state
4. Deep-link: opening a table from Schema “Open” jumps to browse

## Done when

- [ ] Creating `lab_notes` (example) → open it → see empty or seeded rows without SQL CLI
- [ ] `records` still has bucket + insert/edit OCC path
- [ ] Browser never touches `data/jord.db`
