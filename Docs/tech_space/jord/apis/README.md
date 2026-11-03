---
title: "Jord — APIs"
description: "Generated records CRUD catalog, built-in function steps, custom /x/:slug bindings, shared PG rate/idempotency (S0036), and Functions v2 ADR"
created: 2026-10-24
updated: 2026-10-29
tags:
  - tech-space
  - jord
  - apis
  - s0036
  - rate-limit
  - idempotency
---

# Jord — APIs

> Who: anyone exposing or disabling HTTP. Roles: [[../auth/README]]. Writes inside steps: [[../writes/README]].

## Why

Studio should show which HTTP exists and let an admin turn a surface off, without uploading JavaScript. Functions are ordered built-in steps. Custom APIs are a method + slug bound to a function.

## What

**Generated catalog** (in-process Map, seeded by `JORD_GENERATED_API_DISABLED`). Resource in the catalog today: `records`. Read: any authenticated role. Toggle: admin. Disabled calls return **503** `{ error: "api_disabled", resource }`. Schema routes are not in this catalog.

| Method | Path |
|--------|------|
| `GET` | `/apis/generated` and `/apis/generated/:resource` |
| `PATCH` | `/apis/generated/:resource` `{ enabled }` |

**Functions** persist in `jord_functions`. Steps: `echo`, `records_list`, `records_get`, `records_insert`, `records_count`. No `eval`. Invoke is editor+. Manage is admin. Delete returns **409** `has_dependents` while a custom API still points at the function.

| Method | Path |
|--------|------|
| `GET` / `POST` | `/functions` |
| `PATCH` / `DELETE` | `/functions/:id` |
| `POST` | `/functions/:id/invoke` |

**Custom APIs** persist in `jord_custom_apis`. Dispatch is `ALL /x/:slug`. Disabled → **503** `{ error: "api_disabled", kind: "custom", id }`. Optional seed: `JORD_CUSTOM_API_DISABLED`.

## How

| Piece | Path |
|-------|------|
| Generated registry | `cloud/jord/src/generated-api/` |
| Step runner | `cloud/jord/src/functions/` |
| Tables | `elements/jord/src/schema/functions.ts` |
| Studio | `/apis/generated`, Function APIs, Custom APIs |

Step writes call `enqueueWrite`. `records_*` steps use the same policy gate as HTTP.

## Example

Bind `POST /x/count-notes` to a function whose only step is `records_count`. An editor `POST /x/count-notes` runs the pipeline. A readonly token gets **403**. An admin toggle off returns **503** on the next call.

## Table API (S0022)

Authenticated `GET|POST|PATCH|DELETE /api/v1/:table` and `GET /api/v1/openapi.json`. Filters are `column=op.value` with `eq neq gt gte lt lte like ilike in is`. Values are coerced to the introspected column type and bound. Identifiers come from that column list only.

`ilike` is `lower(column) LIKE lower(?)` on libSQL. That is not Postgres Unicode `ILIKE`.

Caps: default limit **100**, max **1000**, `in(...)` max **100**, JSON body **1 MiB** (S0028). PATCH and DELETE without a filter return **400**. `?all=true` is **service only**. A table with no primary key rejects PATCH and DELETE. Composite keys are repeated `pk` query params in column order.

`Prefer: count=planned` may return `count: null` on libSQL (no planner estimate). `Prefer: count=exact` runs `COUNT(*)` and is costly. It is not the default. `Prefer: return=representation` uses `RETURNING` (tested on file libSQL and live Postgres). Writes on tracked tables emit `jord.change` through the shared outbox helper; see [[../realtime/README]].

`records` still honors `JORD_GENERATED_API_DISABLED` (**503**). User and anon stay default-deny until a policy allows the table. `/api/v1` shares the data-route limit (120 / minute) and idempotency.

Studio playground: `/apis/table` (Apolyx). Apps call the same routes through `@altr/jord-client` (`tableFetch` and `JordClient`). That package does not import `@altr/jord`. Studio keeps its own BFF and does not embed the client.

## Keyset pagination (S0079)

`GET /api/v1/:table?cursor=&limit=&order=` — an empty `cursor=` starts cursor mode; the response is `{data, count, next_cursor, has_more}` and offset responses are unchanged. The order is the requested `order` plus the primary key as tiebreaker (no PK = 400 `no_key`; a nullable order column = 400 `nullable_order`). A cursor is `base64url(JSON{table, schema, order, last-row keys}).HMAC-SHA256`, keyed by `JORD_CURSOR_SECRET` (random per process when unset, so cursors then expire on restart); the decoded order must equal the order derived from the request, values are bound parameters, and row scope/RLS is the same `WHERE` as offset paging. `cursor` is a reserved parameter. Open: Postgres suite not run in CI here, OpenAPI does not list `cursor`, cursors are not bound to the filter set.

## Bulk upsert + RPC (S0080)

`POST /api/v1/:table/bulk` takes a bare array of 1..500 rows (`on_conflict=a,b`, `resolution=merge|ignore`, `atomic=true`) and always answers `200 {inserted, updated, ignored, failed, results[]}` with one result per row. Default is per-row: one transaction, a SAVEPOINT per row, so a conflict or validation failure never aborts the batch; `atomic=true` rolls everything back on the first failure. `on_conflict` must match the primary key or a valid, immediate, non-partial unique index. Each row is authorized like a single-row write (insert vs update policy, owner stamping, scoped prior-select, `patchKeepsScope`), change events fire once per written row. `POST /api/v1/rpc/:fn` `{args}` runs a registered function as the caller; non-service, non-admin callers only reach functions with an enabled POST custom API (same exposure rule and `JORD_CUSTOM_API_DISABLED` kill switch as `/x/:slug`), everything else is `404 unknown_function`. Open: `/functions` and `/functions/:id/invoke` stay callable by user and anon (own card needed); a bulk request is one rate-limit hit; Postgres runtime untested.

## FK embeds (S0078)

`GET /api/v1/:table?select=*,author(*)` embeds related rows from introspected FKs: many-to-one (named by the target table, or `x` for a single-column `x_id` FK; object or `null`) and one-to-many (named by the child table; array, 100 per parent, `Jord-Embed-Truncated` header). Aliases `alias:relation(cols)`, column subsets, one level, at most 8 embeds, 5000 rows per embed. One batched statement per embed. The embedded table is authorized through the same `decide()` closure and row scope as a direct GET of it (a denied table = 403; hidden parent = `null`; hidden children omitted; the per-parent cap runs after scope filtering). Unknown relation = 400 `unknown_relation` with `available`. Embeds on POST/PATCH/DELETE = 400; they work with `?cursor=`. OpenAPI lists `x-jord-relations`. Open: every embed request introspects all exposed tables; composite-key embeds over ~1000 parents may hit SQLite expression depth; Postgres runtime untested here.

## Shared rate limit + idempotency (S0036)

Data-route limits and `Idempotency-Key` replay are **shared across instances on Postgres** via migration `0007_rate_limit_idempotency`. libSQL stays in-memory. Overview: [[../overview/README#shared-rate-limit--idempotency-s0036]].

| Piece | Path |
|-------|------|
| Rate middleware | `cloud/jord/src/http/data-rate-limit.ts` (optional `RateLimitStore`) |
| Memory / PG rate store | `cloud/jord/src/http/rate-limit-store.ts` |
| Memory idempotency | `cloud/jord/src/idempotency/store.ts` |
| PG idempotency | `cloud/jord/src/idempotency/pg-store.ts` |
| TTL sweep | `cloud/jord/src/idempotency/sweep.ts` · job `shared_state_sweep` |
| Wiring | `cloud/jord/src/app.ts` — `deps.jord.dialect === "postgres"` selects PG stores; `deps.rateLimit` / `deps.idempotency` override for tests |
| Migration | `elements/jord/migrations/{postgres,libsql}/0007_rate_limit_idempotency.sql` |

**429** body for data routes is unchanged: `{ error: "too_many_requests" }`. Auth signup/signin limits remain process-local (S0021-B).

## Client (S0029)

Private workspace package `elements/jord-client`. Fetch only.

- `signIn` stores access and refresh tokens. A **401** refreshes once and retries. `refresh_reused` clears the session and throws `JordSignedOutError`.
- `from(table)` calls `/api/v1/:table`.
- `subscribe({ table, since, onEvent })` opens SSE `GET /realtime`. **410** returns `{ status: "resync" }` and does not emit events.

```ts
const client = new JordClient({ baseUrl: "http://127.0.0.1:8787", tokens });
const live = await client.subscribe({
  table: "notes",
  since: 12,
  onEvent: (message) => console.log(message.event, message.data),
});
if (live.status === "resync") {
  // hint is "resync" — reload the table, then subscribe again
}
```

## Typed client (S0088)

`createClient<Database>({url, key, fetch?})` from `@altr/jord-client` (generated `Database` map from S0087): `.from('schema.table').select('id,author:users(name)')` returns types derived from the select string (columns, one-level embeds, `T | null` for many-to-one), with filters typed by column type, `order` limited to columns, `single` / `maybeSingle`, cursor `paginate()`, and `{data, error, status, count, nextCursor, hasMore}` results (HTTP and network errors never throw; one request per await; `redirect:"error"`; names validated at runtime). Open: the server has no `or=` filter and does not unquote `in.(...)` values; array insert needs `/bulk`; `gen-types` emits no relationships; nested embeds are rejected.

## React bindings (S0089)

`@altr/jord-react` (`elements/jord-react`, peer `react ^18 || ^19`, depends on `@altr/jord-client`): `<JordProvider client realtime? scope?>`, `useJordQuery({table, select, filter, order, limit, pk?, staleTimeMs?})` and `useJordLive(...)`. One cache per provider (stable keys without credentials, one request for concurrent identical queries, stale-while-revalidate, 5 min GC, LRU 100). Live deltas merge by primary key only for unordered, unlimited lists whose selection contains the PK; everything else refetches debounced 250 ms; deltas that arrive during a fetch are replayed by `seq` after the payload lands; a resync replaces the list. Pass `scope` (user id or auth epoch) whenever the client identity can change and call `useJordCache().clear()` on sign-out. Open: no Studio screen consumes it yet; row types are not inferred from `Database`.

## Type generation (S0087)

`pnpm --filter @altr/jord-client jord gen types --url <server> [--token T] [--schema S] [--out F] [--check]` reads `GET /schema/tables` and `/schema/tables/:name` and prints `Row` / `Insert` / `Update` per table plus a `Database` map keyed `schema.table`. Deterministic (sorted, no timestamps); `--check` exits 1 when `--out` is stale or missing; unreachable or unauthorized exits 1 with a one-line error; token from `--token`, `JORD_TOKEN` or `JORD_SERVER_TOKEN` and never written out. Mapping: integer/real -> `number`; bigint/numeric -> `string`; boolean; text/uuid/date-time -> `string`; json -> `unknown`; bytea -> `string` (base64); vectors -> `number[]`; unknown types -> `unknown` with a comment. Responses are capped (16 MiB, 2000 tables), redirects refused. Open: identity columns are guessed from a single integer PK; `tsx` is not a declared dependency of the package.

## Functions v2 (S0026 — ADR only)

User TypeScript handlers are **not** implemented. Decision record: [[ADR-functions-v2]].

- **Recommend** `worker_threads` + wall-clock timeout + restricted message API.
- **Reject** `isolated-vm` (native / node-gyp).
- In-process registered TS handlers are not the default for untrusted code.
- **Do not implement** a worker runtime until a follow-up sprint is explicitly approved. Soft backlog: [[../../../plan/Jord/phase-02/00-remaining-backlog]].

Built-in steps above remain the only function execution path today.

## Not in Jord yet

Embeds, joins, per-operation toggles, arbitrary SQL steps, user-uploaded code / Functions v2 runtime, a generated catalog per user table.
