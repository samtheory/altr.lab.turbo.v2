---
title: "Phase 4 — Studio Policies dialect hint"
description: "Show Postgres RLS compile note on Policies panel; Apolyx-only"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0017
  - jord-studio
  - apollo
---

# Phase 4 — Studio hint

> Who: **mimir → apollo**. Apolyx-first; no new kit primitives.

Sprint: [[README]]

## Status

**done** (2026-10-24)

## Scope (small)

On **Database → Policies** (`PoliciesPanel`):

- When health/dialect is `postgres`, show a short `Alert` (or existing kit notice): policies are enforced in the API **and** compiled to Postgres RLS on `records`.
- When `file` / libSQL: optional one-liner that enforcement is server middleware only.
- No new CRUD fields; no SQL editor.

Reuse `@altr/apolyx` `Alert` (or whatever the panel already uses). Do not invent local primitives.

## Done when

- [ ] Operator can see which enforcement path applies without reading vault notes
