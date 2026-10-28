---
title: "S0079 — keyset (cursor) pagination"
description: "Stable cursor paging ordered by a unique key, backed by a composite index, with an opaque cursor and deterministic results under concurrent inserts"
created: 2026-10-28
updated: 2026-10-28
tags:
  - plan
  - jord
  - phase-03
  - task
  - S0079
---

# S0079 — keyset (cursor) pagination

> **Status:** todo · **Phase:** [[README]] · Parent: [[../../../feature_list/Jord/todo/jord-F0017-table-api-v2|jord-F0017]] · After ship: [[../../../tech_space/jord/apis/README]]

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
| Intent | [[../../../feature_list/Jord/todo/jord-F0017-table-api-v2|jord-F0017]] · [[../../../feature_list/Jord/todo/jord-F0025-tables-workspace-v2|jord-F0025]] |
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

- [ ] Cursor walk over a table with concurrent inserts has no dupes/gaps (tested)
- [ ] Composite-key ordering works on both dialects
- [ ] Forged cursor → 400
- [ ] Offset paging unchanged for existing clients
- [ ] Proof pasted

## Proof

| Date | Command | Result |
|------|---------|--------|
| | `pnpm --filter @altr/jord-server test` | |

## After ship

| Update | Path |
|--------|------|
| tech_space | `Docs/tech_space/jord/apis/README.md` |
| Queue | [[README]] |
