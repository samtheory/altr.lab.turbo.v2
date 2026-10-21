---
title: "Phase 3 — records DELETE (complete CRUD)"
description: "Add DELETE /records/:id via write queue so generated catalog is honest CRUD"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - jord
  - Jord-S0006
---

# Phase 3 — records DELETE (complete CRUD)

> Who: **sindri**. Engine may need `deleteRecord` on the port if missing.

Sprint index: [[README]] · Engine: [[../../../tech_space/jord/00-s0001-slice0]]

## Status

**done** (2026-10-21)

## Clarification

S1–S3 shipped list / get / insert / OCC patch. There is **no** HTTP DELETE today. Studio S4’s “CRUD” catalog must not advertise delete until the verb exists — or must omit it. **This sprint adds DELETE** so the panel matches Supabase-like expectations.

## Proposed API

| Method | Path | Auth | Behavior |
|--------|------|------|----------|
| `DELETE` | `/records/:id` | write (`editor` / `admin`) | Queued delete; **404** if missing; honor generated-api disable |

Optional body: none. Query: none. Response: `{ ok: true, id }` or 204 — pick one and test it.

## Engine

- Prefer a `deleteRecord(id)` (or equivalent) on `JordDriverPort` / LibSqlAdapter
- Run inside `enqueueWrite` only
- No soft-delete column in S4 unless already present (hard delete is fine for lab scratchpad)

## Tasks

- [x] Port + adapter delete (with unit test)
- [x] HTTP route + auth + disable guard
- [x] Catalog operation entry for DELETE

## Done when

`DELETE /records/:id` removes the row; subsequent GET is 404; OCC / auth tests still green.
