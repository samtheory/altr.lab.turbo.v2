---
title: "Phase 7 — retire the base Turso stub"
description: "Stop @altr/base/db from looking like a second live database client"
created: 2026-10-18
updated: 2026-10-18
tags:
  - plan
  - jord
  - Jord-S0001
---

# Phase 7 — retire the base Turso stub

> Who: implementer (**sindri**). `@altr/base` stays a **leaf** utils package — no dep on `@altr/jord`. See [[../../../../feature_list/00-elements-dependency-rules]].

Sprint index: [[README]] · Code today: `elements/base/src/db/index.ts` throws from `createTursoClient`.

## Behavior

- Remove the implication that Turso wiring belongs in `@altr/base`. The module may keep a tiny deprecated export that throws and tells the caller to use `@altr/jord` and `DATABASE_URL`.
- Do not add `@libsql/client` to `@altr/base`.
- Update the comment in that file. It currently says the primary DB is Turso.

## Tasks

- [ ] `elements/base/src/db/index.ts` no longer documents a future Turso client
- [ ] `pnpm --filter @altr/base typecheck` still passes
- [ ] No import of `@altr/jord` from `@altr/base` (the library must not depend on the stub, and the stub must not become a wrapper)

## Done when

A reader of `@altr/base/db` sees one message: use `@altr/jord`. There is still only one implementation, in `elements/jord`.
