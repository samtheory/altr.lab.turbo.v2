---
title: "Phase 1 — Jord packages"
description: "Scaffold @altr/jord and @altr/jord-server so later cards have a place to land"
created: 2026-10-18
updated: 2026-10-18
tags:
  - plan
  - jord
  - Jord-S0001
---

# Phase 1 — Jord packages

> Who: implementer. Empty packages only. Driver behavior is card 2.

Sprint index: [[README]] · Intent: [[../../../../feature_list/Jord/00-intent]]

Workspaces already include `elements/*` and `cloud/*` (`pnpm-workspace.yaml`). New folders are picked up without a workspace edit.

## Packages

| Path | Name | Scripts |
|------|------|---------|
| `elements/jord` | `@altr/jord` | `typecheck` (`tsc --noEmit`), `test` (vitest) |
| `cloud/jord` | `@altr/jord-server` | `typecheck`, `dev` (Node, see card 6) |

Match `elements/base`: `"type": "module"`, `private`, `tsconfig.json` extends `../../tsconfig.base.json`.

## Dependencies

| Package | Deps |
|---------|------|
| `@altr/jord` | `drizzle-orm`, `@libsql/client`. Dev: `typescript`, `vitest`, `@types/node` |
| `@altr/jord-server` | `hono`, `@hono/node-server`, workspace `@altr/jord` |

Do not add `postgres`, `pg`, `better-sqlite3`, `bun`, Redis, Mongo, or `sqlite-vec`.

## Tasks

- [ ] Both `package.json` files and tsconfigs exist
- [ ] `pnpm install` links them
- [ ] `@altr/jord` exports a placeholder `createJordClient` type surface that card 2 replaces (or leave the export for card 2 if the file would only throw)

## Done when

`pnpm --filter @altr/jord typecheck` and `pnpm --filter @altr/jord-server typecheck` run. They may pass on empty `src/index.ts` files.
