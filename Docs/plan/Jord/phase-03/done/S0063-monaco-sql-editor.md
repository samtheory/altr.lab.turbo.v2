---
title: "S0063 — Monaco SQL editor + schema-aware completion"
description: "Apolyx SqlEditor (lazy Monaco) replaces the textarea console: dialect highlighting, project-scoped completion, find/replace, multi-cursor, format document"
created: 2026-10-28
updated: 2026-11-02
tags:
  - plan
  - jord
  - phase-03
  - task
  - S0063
  - done
---

# S0063 — Monaco SQL editor + schema-aware completion

> **Status:** **done** 2026-11-02 · **Phase:** [[../README]] · Parent: [[../../../../feature_list/Jord/todo/jord-F0028-sql-editor-v2|jord-F0028]] · After ship: [[../../../../tech_space/jord/studio/README#sql-editor-s0024--s0063]]

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

The console was a textarea; `jord-F0028` and the saved-query sidebar both need a real editor first.

## What shipped

| Piece | Fact |
|-------|------|
| Kit component | `SqlEditor` in `elements/ui-kit/src/components/ui/sql-editor.tsx`; exported from `@altr/apolyx` (Apolyx-first — no editor code in the app) |
| Kit language lib | `elements/ui-kit/src/lib/sql-language.ts` — completion items, FK join conditions, `formatSql`, `sqlLanguageId` |
| Engine | `monaco-editor@0.57.0` as a kit dependency, loaded through `loadSqlEditorEngine()` (`import("monaco-editor")`) inside a mount effect |
| Dialect | libSQL → Monaco language `sql`; Postgres → `pgsql`. `inferSqlDialect(engine, schemaNames)` — registry engine wins, `env` projects infer from the schema listing (`main` only → libSQL) |
| Completion | Keywords/functions per dialect, schemas, tables, columns with type + pk in the detail, and `a.col = b.col` FK conditions offered only inside an `ON …` context |
| Scope | One `SqlCompletionModel` per project slug (`createSqlModelCache`); the editor reads only the active slug — no cross-project leakage |
| Introspection | `GET /api/schema/schemas` → per-schema `GET /api/schema/tables?schema=` → `GET /api/schema/tables/:name?schema=`, table details capped at 6 concurrent requests |
| Refresh | Manual **Refresh schema** button + refetch on window focus when the model is older than 60 s |
| Editing | Monaco find/replace, multi-cursor, bracket matching/pair guides, undo; `Shift+Alt+F` formats through a document-formatting provider backed by `formatSql`; `Ctrl/Cmd+Enter` runs |
| Draft | `sessionStorage` key `jord.studio.sql:v1:<projectSlug>` — query text survives tab switches/navigation in the session |
| Result contract | Unchanged: `POST /sql/execute` with `readOnly` toggle, audit + `resync` behavior untouched (results grid is [[S0065-results-explain-cancel|S0065]]) |

### Bundle delta (recorded)

| Measurement | Value |
|-------------|-------|
| `next build` exit | 0 |
| `/p/[project]/database/sql` First Load JS | **177 kB** (siblings: connection 116 kB, policies 175 kB, jobs 180 kB — the editor adds nothing to first load) |
| Route page chunk | **16 kB** (5.63 kB route JS) |
| Monaco lazy chunks | **5 chunks · 4160 kB total** (`13.8c8f…` 3864 kB core + 124 + 104 + 32 + 24 kB) |
| Preload check | `page-*.js` contains no `monaco` reference and the route manifest lists none of the Monaco chunks |

## Done when

- [x] Monaco loads lazily and renders with the right dialect
- [x] Completion offers only the active project's objects (asserted)
- [x] Format/find/replace/multi-cursor work
- [x] Bundle delta recorded
- [x] Proof pasted

## Proof

| Date | Command | Result |
|------|---------|--------|
| 2026-11-02 | `pnpm --filter @altr/apolyx exec vitest run src/lib/sql-language.test.ts` | **11 passed** · dialect ids, scoped completion, FK joins, formatter · exit 0 |
| 2026-11-02 | `pnpm --filter @altr/apolyx exec vitest run` | **41 files · 187 passed** · exit 0 |
| 2026-11-02 | `pnpm --filter @altr/jord-studio exec node --import tsx --test src/lib/studio-sql-editor.test.ts` | **9 passed** · dialect inference, model build, per-project cache isolation, draft persistence, bounded introspection fetch · exit 0 |
| 2026-11-02 | `pnpm --filter @altr/apolyx typecheck` | exit 0 |
| 2026-11-02 | `pnpm --filter @altr/jord-studio typecheck` | exit 0 |
| 2026-11-02 | `pnpm --filter @altr/jord-studio build` | exit 0 · SQL route 177 kB first load · Monaco isolated in 5 lazy chunks |

## After ship

| Update | Path |
|--------|------|
| tech_space | `Docs/tech_space/jord/studio/README.md` · `Docs/tech_space/ui-kit/README.md` |
| Queue | [[../README]] |
