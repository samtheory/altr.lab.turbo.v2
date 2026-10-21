---
title: "Jord-S0003 — Studio shell + table-editor UX as-built"
description: "Categorized side nav; Supabase-like Insert/Edit row for SQL records columns"
created: 2026-10-21
updated: 2026-10-21
tags:
  - tech-space
  - jord
  - Jord-S0003
  - jord-studio
---

# Jord-S0003 — Studio shell + table-editor UX as-built

> Who: Studio operators / mimir after S1.5. Plan: [[../../plan/Jord/Jord-S0003/README]] · Prior: [[01-s0002-studio-s1]] · Engine: [[00-s0001-slice0]].

## What changed

| Area | As-built |
|------|----------|
| Shell | `StudioShell` — sticky header + left `NavList` (desktop) + left `Sheet` (mobile) |
| Nav config | `apps/jord-studio/src/lib/studio-nav.ts` — Data / Runtime / APIs / Database / Help |
| Live routes | `/records`, `/records/new`, `/help` (+ home `/`) |
| Placeholders | Jobs, Logs, APIs, Schema, Policies, Roles — disabled + badge (S2–S7) |
| Insert / Edit | Shared `RecordRowFields` — column labels `bucket`, `body`, `metadata`; server columns shown read-only on edit |
| JSON | Optional Switch “Validate as JSON” on `body` — still stores TEXT via existing BFF |

No new jord-server routes. No kit primitives invented in the app — Apolyx only (`NavList`, `Sheet`, `Table`, `Field`, `Select`, `Switch`, `Badge`, `ScrollArea`, …).

## SQL reminder

Storage remains **libSQL**. UI copy says table `records` / columns. `body` is TEXT (often a JSON *string*).

## Verify (2026-10-21)

- `pnpm --filter @altr/jord-studio typecheck` — pass
- Manual BFF: health → insert → patch → stale **409**

## Links

- Intent: [[../../feature_list/Jord/03-jord-studio]]
- Plan (closed): [[../../plan/Jord/Jord-S0003/README]]
