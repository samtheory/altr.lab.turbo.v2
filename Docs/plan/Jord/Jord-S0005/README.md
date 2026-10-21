---
title: "Jord-S0005 — Studio S3 auth + feature roles"
description: "Closed: sessions, jord-server bearer auth, admin/editor/readonly gates"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - jord
  - Jord-S0005
  - jord-studio
  - sprint
  - auth
---

# Jord-S0005 — Studio S3 auth + feature roles

> Who: **mimir**. **Status: done (2026-10-21).** As-built: [[../../../tech_space/jord/04-s0005-auth]]. Intent S3: [[../../../feature_list/Jord/03-jord-studio]]. Prior: [[../Jord-S0004/README]].

**Sprint id:** `Jord-S0005`  
**Opened:** 2026-10-21 · **Closed:** 2026-10-21 · **Owner:** mimir

## Phases

| # | Card | Status |
|---|------|--------|
| 1 | [[01-auth-contract]] | **done** |
| 2 | [[02-server-auth]] | **done** |
| 3 | [[03-studio-session]] | **done** |
| 4 | [[04-role-gates]] | **done** |
| 5 | [[05-verify]] | **done** |

## Definition of done

- [x] Every card's "Done when" holds
- [x] Unauthenticated request to protected jord-server routes → **401**
- [x] Authenticated `readonly` cannot mutate records or schema → **403**
- [x] Studio without a valid session shows login (or documented `JORD_STUDIO_OPEN` bypass)
- [x] BFF forwards credentials; browser still has no direct `jord.db` access
- [x] Tests + typechecks for jord-server / jord-studio pass
- [x] tech_space [[../../../tech_space/jord/04-s0005-auth]]

## Links

- Track: [[../README]]
- As-built: [[../../../tech_space/jord/04-s0005-auth]]
