---
title: "S0063 — Monaco SQL editor + schema-aware completion"
description: "Replace the textarea console with a full-page Monaco editor, dialect-aware highlighting, and completion limited to the active project's schema"
created: 2026-10-28
updated: 2026-10-28
tags:
  - plan
  - jord
  - phase-03
  - task
  - S0063
---

# S0063 — Monaco SQL editor + schema-aware completion

> **Status:** todo · **Phase:** [[README]] · Parent: [[../../../feature_list/Jord/todo/jord-F0028-sql-editor-v2|jord-F0028]] · After ship: [[../../../tech_space/jord/studio/README]]

## Routing (who / how long / which model)

| | |
|--|--|
| **Suggested agent** | mimir → **apollo** |
| **Companion skills** | `.agents/skills/apollo/` · `.agents/skills/vercel-react-best-practices/` |
| **Suggested model** | `gpt-5.6-sol-medium` |
| **Est. time** | **2–3 h** |
| **Parallel?** | **No** |

## Goal

`/p/[project]/database/sql` hosts Monaco full-page with SQL dialect highlighting, keyword/function completion, and **project-scoped** table/column/FK completion built from introspection — plus find/replace, multi-cursor and format document.

## Why now

The console is a textarea; `jord-F0028` and the saved-query sidebar both need a real editor first.

## Context (read before coding)

| Kind | Where |
|------|-------|
| Intent | [[../../../feature_list/Jord/todo/jord-F0028-sql-editor-v2|jord-F0028]] (Editor) |
| Code today | `apps/jord-studio/src/components/sql-console-panel.tsx` · `app/p/[project]/database/sql/page.tsx` · `cloud/jord/src/sql/routes.ts` (execute + guards) |
| Schema source | introspection from [[S0049-schema-scoped-introspection|S0049]] |
| Bundle rule | load Monaco lazily (dynamic import) so the Studio shell stays light |

**Do not break:** the existing read-only default and audit behavior in `sql/routes.ts`; execution contract unchanged (this card is editor-only).

## In scope

- Monaco via dynamic import; bundle size delta recorded.
- Dialect language: libSQL → SQLite mode, Postgres → pgsql mode; completion items: keywords, functions, schemas, tables, columns (with type in the detail), and FK-suggested join conditions.
- Completion provider per project (no cross-project leakage); refresh when the schema changes.
- Find/replace, multi-cursor, bracket matching, format document (existing formatter dependency or a small one — justify).
- Editor state (query text) preserved when switching tabs within the session.

## Out of scope

Tabs / saved queries / history ([[S0064-query-tabs-history|S0064]]) · results grid + explain + cancel ([[S0065-results-explain-cancel|S0065]]).

## Diagram

```mermaid
flowchart LR
  INTRO[introspection] --> COMP[completion provider]
  COMP --> MON[Monaco editor]
  MON --> RUN[execute button → sql/routes]
  RUN --> RO[read-only guard + audit]
```

## Steps (do in order)

1. Load apollo; read the console panel and execution route.
2. Add Monaco with lazy loading + dialect selection.
3. Build the completion provider from introspection, scoped by project.
4. Add format/find/multi-cursor; preserve text across navigation.
5. Typecheck + build; measure bundle delta; paste proof.
6. **docs_man**: studio tech_space SQL section; tick card.

## Done when

- [ ] Monaco loads lazily and renders with the right dialect
- [ ] Completion offers only the active project's objects (asserted)
- [ ] Format/find/replace/multi-cursor work
- [ ] Bundle delta recorded
- [ ] Proof pasted

## Proof

| Date | Command | Result |
|------|---------|--------|
| | `pnpm --filter @altr/jord-studio build` | |

## After ship

| Update | Path |
|--------|------|
| tech_space | `Docs/tech_space/jord/studio/README.md` |
| Queue | [[README]] |
