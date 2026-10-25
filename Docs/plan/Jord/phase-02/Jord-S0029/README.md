---
title: "Jord-S0029 — @altr/jord-client"
description: "Private fetch client: auth refresh, table API, realtime resume — after CDC"
created: 2026-10-24
updated: 2026-10-25
tags:
  - plan
  - jord
  - Jord-S0029
  - phase-02
  - client
---

# Jord-S0029 — `@altr/jord-client`

> Who: **mimir**. **Status: in tree** (2026-10-25). **Execution #9.** Next: [[../Jord-S0024/README]].

**Sprint id:** `Jord-S0029`  
**Hats:** **sindri** · **docs_man**

## Goal

A private fetch client apps can call without linking the engine or the database driver.

## In scope

- Workspace package `@altr/jord-client` (private, not published)
- Fetch only. **No import of `@altr/jord`**, no libSQL, no Postgres
- Auth: store access + refresh; refresh on 401 once; surface family-revoke as signed-out
- Table API: promote the S0022 **test-folder** fetch helper into this package. Do not leave the helper importing `@altr/jord`
- Realtime: SSE or WS with **`since` resume**; on **410** tell the caller to resync

## Out of scope

Studio (Studio keeps its BFF) · embedding this package inside `apps/jord-studio` server code that already proxies · npm publish

## Definition of Done

- [x] Package typechecks in CI (add it to the S0027 workflow in this sprint)
- [x] Unit tests with a mock fetch: refresh once, resume query string, 410 path
- [x] Dependency check: package.json does not depend on `@altr/jord`
- [x] Short page under `tech_space/jord/apis` or `overview`
