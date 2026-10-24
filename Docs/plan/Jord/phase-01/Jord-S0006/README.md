---
title: "Jord-S0006 — Studio S4 generated CRUD API"
description: "Closed: catalog + inspect/toggle panel for table CRUD routes on jord-server"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - jord
  - Jord-S0006
  - jord-studio
  - sprint
  - generated-api
---

# Jord-S0006 — Studio S4 generated CRUD API

> Who: **mimir**. **Status: done (2026-10-21).** As-built: [[../../../../tech_space/jord/apis]]. Intent S4: [[../../../../feature_list/Jord/03-jord-studio]]. Prior: [[../Jord-S0005/README]].

**Sprint id:** `Jord-S0006`  
**Opened:** 2026-10-21 · **Closed:** 2026-10-21 · **Owner:** mimir  
**Hats:** **sindri** · **heimdall** · **apollo** · **docs_man**

## Phases

| # | Card | Hat | Status |
|---|------|-----|--------|
| 1 | [[01-api-contract]] | mimir / heimdall | **done** |
| 2 | [[02-server-catalog]] | sindri | **done** |
| 3 | [[03-records-delete]] | sindri | **done** |
| 4 | [[04-studio-api-panel]] | apollo | **done** |
| 5 | [[05-role-gates]] | heimdall / apollo | **done** |
| 6 | [[06-verify]] | mimir → docs_man | **done** |

## Definition of done

- [x] Every card's "Done when" holds
- [x] Studio **APIs → Generated API** is `live`
- [x] Catalog + copy curl for `records` CRUD (incl. DELETE)
- [x] Admin disable → **503** `api_disabled`
- [x] `readonly` / `editor` cannot toggle
- [x] Browser never opens `data/jord.db`
- [x] No kit primitives invented in `apps/jord-studio`
- [x] Tests + typechecks pass
- [x] As-built [[../../../../tech_space/jord/apis]]

## Links

- Track: [[../README]]
- As-built: [[../../../../tech_space/jord/apis]]
