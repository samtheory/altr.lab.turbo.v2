# @altr/base

Shared foundation modules for altr.lab: database, env, errors, auth, query, and AI stubs.

## Modules

| Export | Path | Status |
|--------|------|--------|
| `@altr/base/db` | `src/db` | Stub — Turso / libSQL client placeholder |
| `@altr/base/env` | `src/env` | Stub — typed env helpers |
| `@altr/base/errors` | `src/errors` | Minimal shared error types |
| `@altr/base/auth` | `src/auth` | Stub |
| `@altr/base/query` | `src/query` | Stub |
| `@altr/base/ai` | `src/ai` | Stub |

## Primary database

**Turso (libSQL)** is the primary database for this monorepo. Wire `@libsql/client` when ready; see `src/db/index.ts` and `Docs/Altr.lab/stack.md`.

PocketBase remains an optional service under `cloud/pocketbase`. Postgres / MongoDB are documented as later layers only — not defaults.
