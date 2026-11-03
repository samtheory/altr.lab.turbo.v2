---
title: "S0078 — one-level FK embeds with per-table policies"
description: "select=*,author(*) resolves FKs in one query with policies applied to the embedded table, never returning rows the caller could not read directly"
created: 2026-10-28
updated: 2026-11-03
tags:
  - plan
  - jord
  - phase-03
  - task
  - S0078
  - done
---

# S0078 — one-level FK embeds with per-table policies

> **Status:** **done** 2026-11-03 (Postgres run gated) · **Depends on** [[S0055-fk-relationship-editor|S0055]] · **Phase:** [[../README]] · Parent: [[../../../../feature_list/Jord/todo/jord-F0017-table-api-v2|jord-F0017]] · After ship: [[../../../../tech_space/jord/apis/README]]

## Routing (who / how long / which model)

| | |
|--|--|
| **Suggested agent** | mimir → **sindri** (query builder) + **heimdall** (policy parity) |
| **Companion skills** | `.agents/skills/supabase-postgres-best-practices/` · `.agents/skills/graft/` |
| **Suggested model** | `claude-sonnet-5-5-high` — the leak risk is here |
| **Est. time** | **3 h** |
| **Parallel?** | **No** |

## Goal

`GET /api/v1/:table?select=*,author(*)` returns embedded related rows resolved from introspected FKs, with the embedded table's policies applied. An embed never returns a row the caller could not fetch directly, and it does not N+1.

## Why now

`jord-F0006` has no embeds, so every client app hand-joins; and the join is exactly where a policy bypass would hide.

## Context (read before coding)

| Kind | Where |
|------|-------|
| Intent | [[../../../../feature_list/Jord/todo/jord-F0017-table-api-v2|jord-F0017]] |
| Depends on | [[S0055-fk-relationship-editor|S0055]] (FK metadata) · [[S0049-schema-scoped-introspection|S0049]] (schema scope) |
| Code today | `cloud/jord/src/table-api/{query,sql,routes,openapi}.ts` · `cloud/jord/src/policies/` · `elements/jord/src/schema/row-scope.ts` |
| Tests | `cloud/jord/src/table-api/__tests__/` · `elements/jord/src/schema/row-scope.test.ts` |

**Do not break:** existing `select` syntax and response shape for non-embed requests; policy evaluation must run on the **embedded** table, not just the root.

## In scope

- Parser for `select=*,author(*)`, aliasing (`author:users(*)`), and a column subset inside the embed.
- Resolution: FK direction detection (many-to-one and one-to-many), one level only; unknown relation → 400 listing available relations.
- Implementation: single query (join or lateral) or a batched second query for the id set — no per-row queries.
- Policies: evaluate the embedded table for the same principal; rows filtered by the embedded policy, not the root's.
- OpenAPI: embeds documented per table with the relations available.
- Tests: embed returns only readable rows (two principals); no N+1 (query count assertion); unknown relation 400.

## Out of scope

Nested embeds deeper than one level · M:N through a join table (document as not yet) · aggregates in embeds · RPC.

## Diagram

```mermaid
flowchart LR
  REQ["select=*,author(*)"] --> P[parse]
  P --> FK[resolve FK via introspection]
  FK --> Q[one query for ids]
  Q --> POL[embedded-table policy]
  POL --> OUT[row + author|null]
```

## Steps (do in order)

1. Read the query builder + policy hooks; identify where row scope is applied today.
2. Add the select parser + FK resolver from introspection.
3. Implement the batched fetch and shape the response.
4. Apply the embedded policy; add the leak test with a restricted principal.
5. Update OpenAPI + query-count test.
6. Typecheck + test; paste proof.
7. **docs_man**: apis tech_space embeds; tick card.

## Done when

- [x] `select=*,author(*)` works for many-to-one and one-to-many
- [x] A restricted principal never sees embedded rows it cannot fetch directly (tested)
- [x] No per-row queries (asserted)
- [x] Unknown relation → 400 with the available list
- [x] Proof pasted

## Proof

| Date | Command | Result |
|------|---------|--------|
| 2026-11-03 | `pnpm --filter @altr/jord-server test` (four cards + review fixes, one tree) | **347 passed** \| 22 skipped (44 files, 3 skipped) |
| 2026-11-03 | `pnpm --filter @altr/jord-server exec tsc --noEmit` / `@altr/jord` tsc | clean / clean |
| 2026-11-03 | `pnpm --filter @altr/jord test` | **138 passed** \| 12 skipped |
| 2026-11-03 | `pnpm --filter @altr/jord-client test` | **16 passed** |

## What shipped

| Piece | Fact |
|-------|------|
| Grammar | `select := item ("," item)*`; `item := "*" | column | [alias ":"] relation "(" ("*" | col ("," col)*) ")"`. One level only (nested = 400 `nested_embed`), at most 8 embeds, `__proto__` / `constructor` / `prototype` aliases rejected |
| Relations | many-to-one named by the target table (or `x` for a single-column `x_id` FK) returns an object or `null`; one-to-many named by the child table returns an array capped at 100 per parent (`Jord-Embed-Truncated` header); more than 5000 rows = 400 `embed_too_large`; unknown relation = 400 `unknown_relation` with `available`; ambiguous names, column clashes and embeds on writes = 400 |
| Query shape | one batched statement per embed (never per row), asserted by a query-count test; works with offset and `?cursor=` paging |
| Policy parity | the root table and every embedded table go through the **same** `decide()` closure with the same principal; a denied embedded table is 403 exactly like a direct GET; the embedded table's own row scope sits inside its `WHERE`; the per-parent cap runs after scope filtering; a hidden parent returns `null`, hidden children are omitted |
| OpenAPI | `x-jord-relations` on each GET and component schema; `select` description lists relations |

**Review (heimdall, opus):** no blocker, no leak path found. Fixed: prototype-ish aliases, `keyOf` for `Date` keys. **Not fixed:** every embed request introspects all exposed tables (cost, no cache); composite-key embeds with ~1000 parents may hit SQLite's expression-depth limit (500); `listPoliciesFor` ignores the schema (pre-existing; a direct `?schema=` GET behaves the same); relation names in error bodies include tables the caller cannot read (the OpenAPI doc lists them already).

**Not proven here:** the Postgres variants (skipped, no `JORD_TEST_POSTGRES_URL`); the generated Postgres SQL and `$n` numbering were checked by unit tests and by reading. Two FKs to the same parent make the one-to-many relation ambiguous (no hint syntax); M:N through a join table is out of scope.

## After ship

| Update | Path |
|--------|------|
| tech_space | `Docs/tech_space/jord/apis/README.md` |
| Queue | [[../README]] |
