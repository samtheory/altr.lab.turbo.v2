---
title: "Phase 4 — Studio Live on user tables"
description: "Live toggle for generic table grid; BFF proxy for SSE/WS; Apolyx-only"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0018
  - jord-studio
  - apollo
---

# Phase 4 — Studio Live

> Who: **mimir → apollo**. Apolyx-first.

Sprint: [[README]]

## Status

**done** (2026-10-24)

## Scope

| Surface | Behavior |
|---------|----------|
| User-table browser | Add **Live** switch (same pattern as records: Apolyx `Switch` + `Badge`) |
| On event | Refetch current table page / rows |
| Transport | **v1 Studio:** keep **SSE** via BFF (`/api/realtime?table=…`) — widen BFF to pass through user table names. Optional later: WS client |
| Records Live | Unchanged except BFF may already forward `table=records` |

Do not invent kit primitives. Do not open DB from the browser.

## BFF

- Extend `/api/realtime` to allow non-`records` `table` query (validate ident / reserved)
- Cookie → bearer proxy unchanged
- WS BFF proxy **optional** this sprint (browsers can hit jord-server WS only if CORS/auth allow — prefer SSE-through-BFF for Studio)

## Done when

- [ ] Operator can Live-watch a user table grid the same way as records
