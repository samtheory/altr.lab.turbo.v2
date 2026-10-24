---
title: "Jord-S0003 — Studio shell + table-editor UX"
description: "Closed: categorized side nav and Supabase-like insert/edit for SQL records (libSQL)"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - jord
  - Jord-S0003
  - jord-studio
  - sprint
---

# Jord-S0003 — Studio shell + table-editor UX

> Who: **apollo** under **mimir**. **Status: done (2026-10-21).** As-built: [[../../../../tech_space/jord/studio]]. Intent: [[../../../../feature_list/Jord/03-jord-studio]]. Prior: [[../Jord-S0002/README]] · [[../../../../tech_space/jord/studio]].

**Sprint id:** `Jord-S0003`  
**Opened:** 2026-10-21 · **Closed:** 2026-10-21 · **Owner:** apollo (UI) under mimir

## Goal

1. Studio chrome with categorized left **side nav**.
2. Insert / edit `records` as **column fields** (Supabase-like table editor).
3. BFF unchanged; browser never opens `data/jord.db`.

## Phases

| # | Card | Status |
|---|------|--------|
| 1 | [[01-side-nav]] | **done** |
| 2 | [[02-table-editor-insert]] | **done** |
| 3 | [[03-table-editor-browse]] | **done** |
| 4 | [[04-verify]] | **done** |

## Definition of done

- [x] Every card's "Done when" holds
- [x] Operator can insert via column fields without thinking Jord is a JSON DB
- [x] Side nav shows live Data routes and honest placeholders
- [x] `pnpm --filter @altr/jord-studio typecheck` passes
- [x] tech_space note ([[../../../../tech_space/jord/studio]])
- [x] No kit primitives invented inside `apps/jord-studio`

## Links

- Track: [[../README]]
- As-built: [[../../../../tech_space/jord/studio]]
