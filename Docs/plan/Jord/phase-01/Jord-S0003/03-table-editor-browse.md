---
title: "Phase 3 — browse/detail as table editor"
description: "List and edit views use SQL column vocabulary and Supabase-like row edit"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - jord
  - Jord-S0003
---

# Phase 3 — browse/detail as table editor

> Who: **apollo**. Read/OCC paths already exist; polish presentation.

Sprint index: [[README]]

## UI

- Records list page reads as **Table: records** (bucket filter stays)
- Column headers match SQL names: `id`, `bucket`, `version`, `updated_at`, `body` (preview)
- Detail / edit: same column fields as Insert; Save still sends `version` and handles **409**
- Prefer inline row edit panel or dedicated edit page that looks like “Edit row”, not “JSON document”
- Keep OCC conflict messaging from S1

## Status

**done** (2026-10-21)

## Tasks

- [x] Align list headings + empty states with table vocabulary
- [x] Align detail/edit with Insert column form (shared field component OK)
- [x] Preserve 409 reload behavior

## Done when

Browse → open → edit → save feels like editing a SQL row in a table editor; stale version still surfaces 409.

