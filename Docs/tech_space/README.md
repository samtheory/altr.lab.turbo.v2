---
title: "tech_space — as-built docs"
description: "Technical implementation notes that grow with the codebase"
created: 2026-09-19
updated: 2026-10-24
tags:
  - tech-space
  - readme
  - Jord-S0001
  - Jord-S0002
  - Jord-S0010
  - Jord-S0012
---

# tech_space

As-built technical docs. Edit when behaviour or schema ships.

Map: [[../brain/00-Docs-Brain]] · Truth: **code** wins over this folder if they disagree; then update this folder.

## Notes

- [[jord/17-s0018-realtime-ws]] — **Jord-S0018** realtime WS + multi-table fanout (2026-10-24)
- [[jord/16-s0017-postgres-rls]] — **Jord-S0017** native Postgres RLS from Jord policies (2026-10-24)
- [[jord/15-s0016-schema-drop-rename]] — **Jord-S0016** schema DROP / RENAME / type (2026-10-24)
- [[jord/12-s0013-blobs]] — **Jord-S0013** local blob buckets + Studio Storage (2026-10-24)
- [[jord/14-s0015-user-table-writes]] — **Jord-S0015** user-table insert/update/delete + Studio grid (2026-10-24)
- [[jord/13-s0014-vectors]] — **Jord-S0014** vectors / `searchVectors` + Studio Vectors (2026-10-24)
- [[jord/11-s0012-multi-table]] — **Jord-S0012** CREATE TABLE + generic table browse (2026-10-24)
- [[jord/10-s0011-realtime]] — **Jord-S0011** Studio S9 realtime SSE + Live toggle (2026-10-24)
- [[jord/09-s0010-postgres]] — **Jord-S0010** Studio S8 PostgresAdapter + Connection page (2026-10-24)
- [[jord/08-s0009-triggers-policies]] — **Jord-S0009** Studio S7 triggers + policies (2026-10-23)
- [[jord/07-s0008-custom-function-apis]] — **Jord-S0008** Studio S6 custom + function APIs (2026-10-21)
- [[jord/06-s0007-jobs-logs]] — **Jord-S0007** Studio S5 jobs scheduler + log ring (2026-10-21)
- [[jord/05-s0006-generated-api]] — **Jord-S0006** Studio S4 generated CRUD API catalog + DELETE (2026-10-21)
- [[jord/04-s0005-auth]] — **Jord-S0005** Studio S3 auth + feature roles (2026-10-21)
- [[jord/03-s0004-schema]] — **Jord-S0004** schema introspect + Studio `/schema` + ADD COLUMN (2026-10-21)
- [[jord/02-s0003-studio-shell]] — **Jord-S0003** side nav + table-editor Insert/edit (2026-10-21)
- [[jord/01-s0002-studio-s1]] — **Jord-S0002** Studio S1: `apps/jord-studio` BFF + Apolyx records browser (2026-10-21)
- [[jord/00-s0001-slice0]] — **Jord-S0001** Slice 0: `@altr/jord` + `@altr/jord-server`, WAL, OCC → 409, `pnpm db:snapshot` (2026-10-21)
- [[ui-kit/README]] — **Apolyx** (`@altr/apolyx`) as-built; sprints **Apolyx-S0001**–**Apolyx-S0005** closed
  - [[ui-kit/10-s0005-product-gate]] — S0005: Select, Combobox, Pagination, Scroll Area, Progress, Accordion / Collapsible, Radio Group (74 registry, 163 tests; 2026-10-21)
  - [[ui-kit/09-s0004-popover]] — S0004: Popover parts, click/hover, origin-aware pop/slide/fade, docs recipes (2026-10-18)
  - [[ui-kit/08-s0003-switch-inputs]] — S0003: Switch physics + family, `ControlBox`, Password / Number / OTP / Mask, Forms docs (2026-10-14)
  - [[ui-kit/07-timeline]] — Timeline component, added after S0002 (2026-10-14)
  - [[ui-kit/05-docs-app#Sidebar groups]] — docs sidebar: collapsible groups, depth guide line, open background (2026-10-14)
- [[03-sample-apps-removed]] — sample Next apps and `hono-server` / `ai-bot-agent` deleted (2026-10-18)
- [[01-hub-ui-kit-base]] — historical `@altr/hub`, `@altr/ui-kit`, `@altr/base` (2026-09-20; hub app removed 2026-10-18)
- [[02-ui-kit-storybook]] — Storybook 9 (historical package name; renamed 2026-10-11)

**Next:** Jord-S0016 on [[../plan/Jord/00-remaining-backlog]] or Artemis. Latest as-built: [[jord/14-s0015-user-table-writes]].
