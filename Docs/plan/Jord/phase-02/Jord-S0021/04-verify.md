---
title: "S0021 verify — docs_man handoff"
description: "Close S0021 only after A, B, ADR, and C Definitions of Done are green"
created: 2026-10-24
updated: 2026-10-25
tags:
  - plan
  - jord
  - Jord-S0021
  - verify
---

# Verify — S0021

> Sprint: [[README]]. Hat: **mimir → docs_man**. Tag: none (docs only).

## Status

**done** (2026-10-25, closed in [[../../phase-02.5/README|phase-02.5]] S0033)

## R4. Doc ownership

Each of Part A, Part B, and Part C updates its own `Docs/tech_space/jord/*` page in its own PR (overview, auth, policies).

Verify only reconciles links, ticks F1–F3, and refreshes STATUS. It writes no new content.

## Done when

- [x] Part A, Part B, and Part C Definitions of Done are all checked. The last Postgres boxes (advisory lock, pool leak, dialect pair) were closed from a live Postgres run on 2026-10-25
- [x] [[ADR-threat-model]] matches the code that shipped. Principals, trust zones, and the libSQL capture boundary are unchanged. Row predicates (`owner_eq`, `claim_eq`, OR across allows) live in [[../../../../tech_space/jord/policies/README]]
- [x] Links among overview / auth / policies still resolve. A wikilink check over those pages and this sprint folder found 0 broken links
- [x] Tick F1–F3 in [[../../../../feature_list/Jord/done/README]]
- [x] Refresh [[../../../../report/STATUS]] when the sprint closes

## Proof (2026-10-25, local `pgvector/pgvector:pg16`, `JORD_TEST_POSTGRES_URL` set)

| Suite | Result |
|-------|--------|
| `pnpm --filter @altr/jord exec vitest run` | 22 files, 75 passed, 1 skipped (hosted `libsql://` live; needs Turso credentials) |
| `pnpm --filter @altr/jord-server exec vitest run` | 15 files, 137 passed, 3 skipped (the Postgres-only tests, on their file pass) |
| `pnpm --filter @altr/jord-client exec vitest run` | 1 file, 6 passed |
| Typecheck `@altr/jord`, `@altr/jord-server`, `@altr/jord-client`, `@altr/jord-studio` | 0 errors |
