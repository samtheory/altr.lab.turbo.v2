---
title: "Phase 5 — verify + docs_man closeout"
description: "Tests, typecheck, as-built; next card is S0020 last numbered"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0019
  - docs_man
---

# Phase 5 — verify + docs_man closeout

> Who: **mimir** → **docs_man**. Sprint: [[README]].

## Status

**done** (2026-10-24)

## Command proof (expected)

```bash
# @altr/jord unit (no Turso required)
# @altr/jord-server tests
# typecheck jord / jord-server / jord-studio
```

Optional live:

```bash
# JORD_TEST_LIBSQL_URL=libsql://… LIBSQL_AUTH_TOKEN=…  → gated round-trip
```

## Docs_man after green

| Doc | Action |
|-----|--------|
| `Docs/tech_space/jord/18-s0019-hosted-libsql.md` | As-built |
| `Docs/plan/Jord/Jord-S0019/*` | Mark done |
| `Docs/plan/Jord/README.md` | S0019 done; next S0020 |
| `Docs/plan/Jord/00-remaining-backlog.md` | S0019 done; next = last numbered S0020 |
| `Docs/report/STATUS.md` · `Jord-implemented-review.md` | Refresh |
| `Docs/brain/*` · feature_list Jord | Point next = S0020 |
| mimir workflow / skill | S0019 closed; active S0020 |

## Done when

- [ ] Definition of done on [[README]] checked
- [ ] Next open card is **Jord-S0020** (hard `pgvector` / sqlite-vec) — **last numbered sprint**
