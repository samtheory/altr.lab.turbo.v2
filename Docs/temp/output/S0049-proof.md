# S0049 proof — schema-scoped introspection

Ephemeral staging output (not vault truth). Run on Windows, branch `main`, nothing committed.

## Required commands (no `JORD_TEST_POSTGRES_URL`, so Postgres suites skip)

| Command | Result |
|---|---|
| `pnpm --filter @altr/jord test` | exit 0 — 26 files passed, 1 skipped; 103 tests passed, 12 skipped |
| `pnpm --filter @altr/jord-server test` | exit 0 — 26 files passed, 1 skipped; 163 tests passed, 18 skipped |
| `pnpm --filter @altr/jord typecheck` | exit 0 (no output) |
| `pnpm --filter @altr/jord-server typecheck` | exit 0 (no output) |

## Live Postgres (`postgres:16-alpine` container, `JORD_TEST_POSTGRES_URL=postgres://postgres:postgres@127.0.0.1:54329/jord`)

| Command | Result |
|---|---|
| `pnpm --filter @altr/jord test` | exit 0 — 27 files passed; 118 tests passed, 2 skipped (includes the live `PostgresAdapter schema scope` suite) |
| `pnpm --filter @altr/jord-server test` | 25 files passed, 1 failed; 226 tests passed, 2 failed |

The two failures are both in `src/realtime/listen.test.ts` (`S0037 LISTEN fan-out`). They are
not caused by S0049: the test does `POST /records` with `body: { n: 1 }` (an object), and
`/records` returns 400 unless `body` is a string. The failure is `expected 400 to be 201`,
raised before any schema code runs. That suite is Postgres-only, so it never ran in the
default (file) configuration.

## What the new tests cover

- `elements/jord/src/schema/schema-scope.test.ts`
  - helpers: `defaultSchemaFor`, `isSystemSchemaName`, `quoteQualified` (rejects bad idents)
  - libSQL: `listSchemas` → `[{ name: "main", readOnly: true }]`; `resolveSchema` accepts
    null / `main`, rejects `public`, `app`, quote and injection strings with `unknown_schema`;
    DDL / row ops on another schema fail with `unknown_schema`; `schema_name` columns exist
    after migration `0011` and the baseline `records` tracking row survives as `main`;
    rename keeps RLS and tracking rows
  - live Postgres: `CREATE SCHEMA app`, `createTable` in `app` and `public` (same name, independent),
    introspection, row CRUD, add / alter / drop column, rename, drop, `unknown_schema`,
    `jord_table_rls` composite key, native RLS enabled on `app.notes` only (`public.notes` unchanged)
- `elements/jord/src/schema/ddl-rls.test.ts`: planner emits `"app"."notes"` for ALTER / CREATE / DROP POLICY
- `cloud/jord/src/table-api/__tests__/table-api.test.ts`: unknown `?schema=` → 400 on the table API,
  openapi, `/schema/tables*`, create (query and body); `GET /schema/schemas`; Postgres end to end
  in a non-public schema (DDL, RLS flag, table API, outbox row, `jord_tracked_tables.schema_name`)
- `cloud/jord/src/policies/part-c.test.ts`: `GET /schema/schemas` is in the mounted inventory and
  maps to the `schema tables` surface
