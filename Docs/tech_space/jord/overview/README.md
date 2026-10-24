---
title: "Jord — overview"
description: "What Jord is, the three packages, the request path, and the invariants that still hold"
created: 2026-10-24
updated: 2026-10-24
tags:
  - tech-space
  - jord
  - overview
  - ci
---

# Jord — overview

> Open this first. Dialects: [[../dialects/README]]. Writes: [[../writes/README]]. Studio: [[../studio/README]].

## Why

One data plane for the lab: a file you can copy, a dialect port so Postgres and hosted libSQL share the same API, and a Studio that never opens the database file.

## What

| Package | Path | Role |
|---------|------|------|
| `@altr/jord` | `elements/jord` | `JordDriverPort`, adapters, schema, vectors, blobs metadata |
| `@altr/jord-server` | `cloud/jord` | Hono HTTP, one write queue, WAL hygiene on file libSQL |
| `@altr/jord-studio` | `apps/jord-studio` | Next.js control plane. UI from `@altr/apolyx` only |

Default data: `data/jord.db` (gitignored). Blob bytes: `data/blobs/`. `@altr/base` is a leaf — it does not open Jord.

Server port **8787** (`PORT`). Studio port **3005**.

## How

```
Studio browser
  → apps/jord-studio BFF  (cookie session → Authorization bearer)
    → cloud/jord
      → enqueueWrite (hot mutations)
        → JordDriverPort
          → LibSqlAdapter | PostgresAdapter
```

`createJordClient({ url })` picks the adapter from `DATABASE_URL`. Boot migrates control-plane tables (`records`, `jord_*`). `GET /health` returns `ok`, `dialect`, `urlScheme`, and `vectorBackend`. It never returns a URL or token.

## Example

```bash
pnpm dev:jord
curl -s http://127.0.0.1:8787/health
```

A file install answers `dialect: "libsql"` and `urlScheme: "file"`.

## CI

Workflow: `.github/workflows/jord.yml` (job name **`jord`**). Triggers: `pull_request` and `push` to `main`. No path filter. Runner: **Node 22 (LTS)** + pnpm from root `packageManager` (`10.27.0`). Local `node -v` may be a newer Current line (e.g. 25); CI stays on LTS for support window and native libSQL binary coverage.

| Package | CI runs |
|---------|---------|
| `@altr/jord` | `typecheck` + `test` (file libSQL always) |
| `@altr/jord-server` | `typecheck` + `test` |
| `@altr/jord-studio` | `typecheck` only (no `test` script in package.json) |

Local equivalent:

```bash
pnpm install --frozen-lockfile
pnpm --filter @altr/jord typecheck
pnpm --filter @altr/jord test
pnpm --filter @altr/jord-server typecheck
pnpm --filter @altr/jord-server test
pnpm --filter @altr/jord-studio typecheck
```

Postgres live tests use secret `JORD_TEST_POSTGRES_URL` in job **`jord-postgres`** (not a required check). The secret is bound to job `env` and each live step uses `if: env.JORD_TEST_POSTGRES_URL != ''` (GitHub does not allow `secrets` in a job-level `if`). When the secret is missing (including forks), live steps are skipped and the job stays green — a green **`jord-postgres`** does **not** prove Postgres was tested. The URL is never echoed.

Branch protection: requiring status check **`jord`** is a **manual admin** step after the first Actions run. Exact check label in the GitHub UI may be `jord` or `jord / jord` — confirm on the first green run.

## Not in Jord yet

Redis, a second bot process, remote S3, hosted embed APIs. Those stay candidates in [[../../../feature_list/Jord/01-phase-02-candidates]].
