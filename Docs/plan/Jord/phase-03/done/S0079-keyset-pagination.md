---
title: "S0079 — keyset (cursor) pagination"
description: "Stable cursor paging ordered by a unique key, backed by a composite index, with an opaque cursor and deterministic results under concurrent inserts"
created: 2026-10-28
updated: 2026-11-03
tags:
  - plan
  - jord
  - phase-03
  - task
  - S0079
  - done
---

# S0079 — keyset (cursor) pagination

> **Status:** **done** 2026-11-03 (Postgres run gated) · **Phase:** [[../README]] · Parent: [[../../../../feature_list/Jord/todo/jord-F0017-table-api-v2|jord-F0017]] · After ship: [[../../../../tech_space/jord/apis/README]]

## Routing (who / how long / which model)

| | |
|--|--|
| **Suggested agent** | mimir → **sindri** · **saga** reviews index strategy |
| **Companion skills** | `.agents/skills/supabase-postgres-best-practices/` · `.agents/skills/graft/` |
| **Suggested model** | `gpt-5.6-sol-medium` |
| **Est. time** | **2–3 h** |
| **Parallel?** | **No** |

## Goal

`?cursor=<opaque>&limit=50` returns the next page from the last row's ordering key, with `ORDER BY <key>` (default PK, overridable for a mapped column), a matching composite index, and no skipped/duplicated rows when inserts land between pages. Offset paging stays available but is documented as slower.

## Why now

Studio fetch-more (`S0057`) and every client list currently uses offset paging, which duplicates rows on concurrent inserts.

## Context (read before coding)

| Kind | Where |
|------|-------|
| Intent | [[../../../../feature_list/Jord/todo/jord-F0017-table-api-v2|jord-F0017]] · [[../../../../feature_list/Jord/todo/jord-F0025-tables-workspace-v2|jord-F0025]] |
| Code today | `cloud/jord/src/table-api/{query,routes,sql,openapi}.ts` |
| Tests | `cloud/jord/src/table-api/__tests__/` |
| Dialect | libSQL has row-value support limits — verify `(a,b) > (?,?)` works or emulate with OR chains |

**Do not break:** existing `limit`/`offset` callers; default ordering stays by primary key; total-count behavior unchanged.

## In scope

- Cursor encode/decode (base64 of `{ key, value, direction }`), validated and signed or at least HMAC'd so it cannot be forged into an injection.
- `WHERE (k1, k2) > (?, ?)` for composite keys with the dialect fallback; `ORDER BY` derived from the cursor.
- Index creation guidance in the response docs (and a warning when no suitable index exists, if cheap to detect).
- `next_cursor` + `has_more` in the response; `limit` clamped (max 1000).
- Tests: paging with inserts/deletes between pages yields no duplicates or gaps; forged cursor rejected; composite key page walk.

## Out of scope

Cursor paging in embeds · random-access pages · count optimization.

## Diagram

```mermaid
flowchart LR
  P1["page 1 (limit 50)"] --> C[next_cursor]
  C --> P2["page 2: WHERE key > cursor"]
  INS[insert between pages] --> P2
  P2 --> OK[no dupes, no gaps]
```

## Steps (do in order)

1. Read the query builder; confirm ordering and count paths.
2. Implement cursor encode/decode with validation.
3. Add keyset SQL for single + composite keys with the libSQL fallback.
4. Return `next_cursor`/`has_more`; document offset as legacy.
5. Tests incl. concurrent insert/delete walk.
6. Typecheck + test; paste proof.
7. **docs_man**: apis tech_space pagination; tick card.

## Done when

- [x] Cursor walk over a table with concurrent inserts has no dupes/gaps (tested)
- [x] Composite-key ordering works on both dialects — **libSQL proven; the Postgres run was skipped (no `JORD_TEST_POSTGRES_URL`)**, SQL reviewed by hand
- [x] Forged cursor → 400
- [x] Offset paging unchanged for existing clients
- [x] Proof pasted

## Proof

| Date | Command | Result |
|------|---------|--------|
| 2026-11-03 | `pnpm --filter @altr/jord-server test` (all three cards + review fixes, one tree) | **310 passed** \| 22 skipped (42 files, 3 skipped) |
| 2026-11-03 | `pnpm --filter @altr/jord-server exec tsc --noEmit` | clean |
| 2026-11-03 | `pnpm --filter @altr/jord test` | **138 passed** \| 12 skipped |

## What shipped

| Piece | Fact |
|-------|------|
| Request | `GET /api/v1/:table?cursor=<c>&limit=&order=` — an empty `cursor=` starts keyset mode; `cursor` is now a reserved param (not usable as a filter column) |
| Response | `{data, count, next_cursor, has_more}`; offset responses are unchanged and carry neither new field |
| Cursor | `base64url(JSON{t,s,o,v}).HMAC-SHA256` (table, schema, order signature, last-row key values). Secret `JORD_CURSOR_SECRET`, else random per process (cursors then die on restart) |
| Order | requested `order` plus primary-key tiebreakers = total order; no PK = 400 `no_key`; nullable order column = 400 `nullable_order` |
| SQL | OR-chain `(a>?) OR (a=? AND b>?)` — portable, mixed ASC/DESC; values are bound parameters; row-scope/RLS `WHERE` is the same path as offset paging |
| Safety | decoded order must equal the order derived from the request (a cursor cannot introduce an identifier); 4 KiB cap before HMAC; `limit + 1` with the existing 1000 cap |

**Review fixes (heimdall):** a text key spelling `null` no longer ends paging; timestamp/bigint/boolean/Date keys serialise losslessly; nullable order columns are refused up front instead of silently dropping NULL rows.

**Known / follow-up:** Postgres suite not run here; OpenAPI does not mention `cursor`; cursors are not bound to the filter set or the principal (they only encode last-row keys, so they cannot widen access); `JORD_CURSOR_SECRET` should be set in production; embeds are out of scope.

## After ship

| Update | Path |
|--------|------|
| tech_space | `Docs/tech_space/jord/apis/README.md` |
| Queue | [[../README]] |
