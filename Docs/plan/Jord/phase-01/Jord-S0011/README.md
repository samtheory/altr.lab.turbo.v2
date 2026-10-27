---
title: "Jord-S0011 — Studio S9 realtime subscriptions"
description: "Done: CDC-equivalent emit after writes → SSE on jord-server; Studio live subscribe UI"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0011
  - jord-studio
  - sprint
  - realtime
  - sse
---

# Jord-S0011 — Studio S9 realtime subscriptions

> Who: **mimir**. **Status: done (2026-10-24).** Intent S9: [[../../../../feature_list/Jord/done/jord-F0012-studio]]. Pillar: [[../../../../feature_list/Jord/INDEX]]. Prior: [[../Jord-S0010/README]]. As-built: [[../../../../tech_space/jord/realtime]].

**Sprint id:** `Jord-S0011`  
**Opened:** 2026-10-24 · **Closed:** 2026-10-24 · **Owner:** mimir  
**Hats:** **sindri** · **saga** · **heimdall** · **apollo** · **docs_man**

## Why this next

Studio S1–S8 and Slice 0 are closed. Lab roadmap also allows **Artemis** as the next *product* gate; this card is the next **Jord** Studio phase (S9). Pick Artemis instead only if the human overrides this open card.

## Phases

| # | Card | Hat | Status |
|---|------|-----|--------|
| 1 | [[01-realtime-contract]] | mimir / heimdall | **done** |
| 2 | [[02-emit-hook]] | sindri | **done** |
| 3 | [[03-server-sse]] | sindri | **done** |
| 4 | [[04-studio-live]] | apollo | **done** |
| 5 | [[05-role-gates]] | heimdall / apollo | **done** |
| 6 | [[06-verify]] | mimir → docs_man | **done** |

## Definition of done

- [x] Every card's "Done when" holds
- [x] After a successful hot write on the server write queue, subscribers receive a change event (libSQL and Postgres)
- [x] Transport v1 is **SSE** (`text/event-stream`) from `@altr/jord-server` (WebSockets deferred)
- [x] Event payload never includes secrets or raw `DATABASE_URL`
- [x] Studio can subscribe to `records` changes and refresh the browse surface without a full page reload
- [x] `readonly` may subscribe; mutate still follows existing role + policy gates
- [x] Browser never opens `data/jord.db`
- [x] No kit primitives invented in `apps/jord-studio` (Apolyx-first)
- [x] As-built `Docs/tech_space/jord/realtime/README.md`

## Explicitly out of this sprint

- Native SQLite update hooks / Postgres `LISTEN/NOTIFY` (optional later; v1 = emit from write path)
- WebSockets
- Blob buckets (S10) / vectors (S11)
- Hosted `libsql://`
- Multi-tenant fanout / channel ACLs beyond feature roles + existing policies
- Artemis trading screens

## Links

- Track: [[../README]]
- Intent: [[../../../../feature_list/Jord/done/jord-F0012-studio]] · Later pillars: [[../../../../feature_list/Jord/INDEX]]
- Roadmap fork: [[../../../00-roadmap-apolyx-jord-artemis]]
