---
title: "tech_space — as-built docs"
description: "Technical implementation notes that grow with the codebase"
created: 2026-09-19
updated: 2026-10-21
tags:
  - tech-space
  - readme
  - Jord-S0001
  - Jord-S0002
---

# tech_space

As-built technical docs. Edit when behaviour or schema ships.

Map: [[../brain/00-Docs-Brain]] · Truth: **code** wins over this folder if they disagree; then update this folder.

## Notes

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

**Next Jord track:** Studio S3+ when mimir opens a new sprint — [[../feature_list/Jord/03-jord-studio]].
