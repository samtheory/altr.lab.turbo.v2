---
title: "Jord-S0021 — migration foundation + principal auth + unified policies"
description: "Three tagged stops (A/B/C) after CI; threat-model ADR before Part C"
created: 2026-10-24
updated: 2026-10-25
tags:
  - plan
  - jord
  - Jord-S0021
  - phase-02
  - auth
  - migrations
  - policies
---

# Jord-S0021 — migration + principal auth + policies

> Who: **mimir**. **Status: Parts A, B, and C are in the tree** for file libSQL (2026-10-25). [[ADR-threat-model]] **accepted for Part C**. Two Part C boxes stay open until Postgres is run (pool leak, dialect pair) and do not block later stops. S0028 through S0023 are in the tree. **Next untouched stop:** [[../Jord-S0029/README]]. Resolutions **R1–R4 approved**. Features: [[../../../../feature_list/Jord/03-phase-02-features]].

**Sprint id:** `Jord-S0021`  
**Owner:** mimir  
**Hats:** **sindri** · **saga** · **heimdall** · **docs_man**

## Stops (separate tags, separate DoD)

| Order | Tag | Card | DoD lives on |
|-------|-----|------|----------------|
| 1 | `jord-s0021-a` | [[01-migration]] | that card |
| 2 | `jord-s0021-b` | [[02-auth]] | that card |
| — | `jord-s0021-adr` | [[ADR-threat-model]] | accepted before C |
| 3 | `jord-s0021-c` | [[03-policy]] | that card |
| 4 | — | [[04-verify]] | docs handoff |

Do not start a stop until the previous stop's Definition of Done is checked.

## Goal

Forward-only migrations; one `Principal` model; server-side policies with identical dialect results.

## Out of scope

OAuth · magic links · real email provider · table API (S0022) · CDC (S0023) · connection URL editor (cut; see S0024)

## Parent Definition of Done

- [ ] A, B, and C each have their own DoD green
- [x] ADR accepted before C merged
- [x] Each part's PR already updated its `tech_space` page (R4). Verify only reconciles links
- [x] Typecheck `@altr/jord` and `@altr/jord-server` (CI from S0027 already required)

## Links

- Track: [[../README]]
- Features: [[../../../../feature_list/Jord/03-phase-02-features]]
