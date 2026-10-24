---
title: "Jord-S0008 — Studio S6 custom + function APIs"
description: "Closed: named custom endpoints + multi-step function pipelines; Studio editors"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - jord
  - Jord-S0008
  - jord-studio
  - sprint
  - custom-api
  - function-api
---

# Jord-S0008 — Studio S6 custom + function APIs

> Who: **mimir**. **Status: done (2026-10-21).** As-built: [[../../../../tech_space/jord/apis]]. Intent S6: [[../../../../feature_list/Jord/03-jord-studio]]. Prior: [[../Jord-S0007/README]].

**Sprint id:** `Jord-S0008`  
**Opened:** 2026-10-21 · **Closed:** 2026-10-21 · **Owner:** mimir  
**Hats:** **sindri** · **saga** · **heimdall** · **apollo** · **docs_man**

## Phases

| # | Card | Hat | Status |
|---|------|-----|--------|
| 1 | [[01-api-contract]] | mimir / heimdall | **done** |
| 2 | [[02-engine-functions-schema]] | sindri / saga | **done** |
| 3 | [[03-server-dispatcher]] | sindri | **done** |
| 4 | [[04-studio-editors]] | apollo | **done** |
| 5 | [[05-role-gates]] | heimdall / apollo | **done** |
| 6 | [[06-verify]] | mimir → docs_man | **done** |

## Definition of done

- [x] Every card's "Done when" holds
- [x] Studio **APIs → Custom APIs** and **Function APIs** are `live`
- [x] Persist functions + custom routes in libSQL; dispatch from `@altr/jord-server`
- [x] Built-in step kinds only (no `eval` / user JS)
- [x] Admin CRUD + enable; non-admin inspect / invoke per contract
- [x] Browser never opens `data/jord.db`
- [x] No kit primitives invented in `apps/jord-studio`
- [x] Tests + typechecks pass
- [x] As-built [[../../../../tech_space/jord/apis]]

## Links

- Track: [[../README]]
- As-built: [[../../../../tech_space/jord/apis]]
