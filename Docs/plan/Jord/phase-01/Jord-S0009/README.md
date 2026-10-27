---
title: "Jord-S0009 — Studio S7 triggers + policies"
description: "Closed: libSQL policy middleware + write-path triggers; Studio Database panels"
created: 2026-10-23
updated: 2026-10-23
tags:
  - plan
  - jord
  - Jord-S0009
  - jord-studio
  - sprint
  - policies
  - triggers
---

# Jord-S0009 — Studio S7 triggers + policies

> Who: **mimir**. **Status: done (2026-10-23).** As-built: [[../../../../tech_space/jord/policies]]. Intent S7: [[../../../../feature_list/Jord/done/jord-F0012-studio]]. Prior: [[../Jord-S0008/README]].

**Sprint id:** `Jord-S0009`  
**Opened:** 2026-10-23 · **Closed:** 2026-10-23 · **Owner:** mimir  
**Hats:** **sindri** · **saga** · **heimdall** · **apollo** · **docs_man**

## Phases

| # | Card | Hat | Status |
|---|------|-----|--------|
| 1 | [[01-security-contract]] | mimir / heimdall | **done** |
| 2 | [[02-engine-schema]] | sindri / saga | **done** |
| 3 | [[03-server-enforcement]] | sindri / heimdall | **done** |
| 4 | [[04-studio-database-ui]] | apollo | **done** |
| 5 | [[05-role-gates]] | heimdall / apollo | **done** |
| 6 | [[06-verify]] | mimir → docs_man | **done** |

## Definition of done

- [x] Every card's "Done when" holds
- [x] Studio **Database → Policies** and **Triggers** are `live`
- [x] Policies persist in libSQL; enforced in `@altr/jord-server` middleware
- [x] Triggers persist in libSQL; fire on successful writes via the server write path
- [x] Built-in rule / action kinds only (no user SQL, no `eval`)
- [x] Admin manage; non-admin inspect per contract
- [x] Browser never opens `data/jord.db`
- [x] No kit primitives invented in `apps/jord-studio`
- [x] Tests + typechecks pass
- [x] As-built [[../../../../tech_space/jord/policies]]

## Links

- Track: [[../README]]
- As-built: [[../../../../tech_space/jord/policies]]
