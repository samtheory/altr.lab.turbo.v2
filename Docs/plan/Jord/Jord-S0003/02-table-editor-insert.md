---
title: "Phase 2 — Supabase-like Insert row"
description: "Column-field insert for SQL table records; body remains TEXT (optional JSON check)"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - jord
  - Jord-S0003
---

# Phase 2 — Supabase-like Insert row

> Who: **apollo**. Engine stays libSQL SQL; no schema change required.

Sprint index: [[README]] · Schema: [[../../../tech_space/jord/00-s0001-slice0]]

## Clarification (for implementers)

| Layer | Truth |
|-------|--------|
| Storage | libSQL file `data/jord.db`, table `records`, SQL `INSERT` via Drizzle / write queue |
| Columns | `id` (server), `bucket`, `body` (TEXT), `metadata` (TEXT nullable), timestamps + `version` (server) |
| S1 UI debt | Create page used a JSON-looking textarea — **UX only**, not a JSON database |

## UI (Supabase Table Editor–like)

- Insert surface titled like **Insert row** / **Add row** for table `records`
- Fields labeled as **columns**:
  - `bucket` — Select / text (required)
  - `body` — large text control; helper: “SQL column `TEXT`. Often a JSON string for scratchpad; plain text is valid.”
  - `metadata` — optional text
- Show read-only hints for server-owned columns: `id`, `created_at`, `updated_at`, `version` (“set on insert”)
- Optional toggle: **Validate as JSON** — if on, parse before submit; on failure show field error and do not POST. If off, submit raw string.
- Submit → existing `POST /api/records` → navigate to detail or refresh list
- Remove or demote copy that implies “paste a JSON document as the database”

## Status

**done** (2026-10-21)

## Tasks

- [x] Replace / redesign create form as column Insert row
- [x] Optional JSON validation mode for `body`
- [x] Success path unchanged (version 1 from server)

## Done when

A new operator can insert without assuming Jord is Mongo/JSON-only; network payload still `{ bucket, body, metadata? }` to jord-server.

