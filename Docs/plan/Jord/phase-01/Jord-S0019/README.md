---
title: "Jord-S0019 — hosted libsql:// (Turso)"
description: "Done: same LibSqlAdapter for remote libsql:// + auth token; file: stays default"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0019
  - jord-studio
  - sprint
  - libsql
  - turso
---

# Jord-S0019 — hosted `libsql://` (Turso)

> Who: **mimir**. **Status: done (2026-10-24).** Prior: [[../Jord-S0018/README]]. As-built: [[../../../../tech_space/jord/dialects]]. Next: [[../../phase-02/00-remaining-backlog]] (**Jord-S0020 — last numbered**).

**Sprint id:** `Jord-S0019`  
**Opened:** 2026-10-24 · **Closed:** 2026-10-24 · **Owner:** mimir  
**Hats:** **sindri** · **heimdall** · **apollo** · **docs_man**

## Design lock (v1) — shipped

| Piece | Choice |
|-------|--------|
| Adapter | Same `LibSqlAdapter` |
| Scheme | `libsql://` + token env |
| Auth | `LIBSQL_AUTH_TOKEN` / `TURSO_AUTH_TOKEN` |
| Dialect | `"libsql"`; `/health.urlScheme` safe label |
| WAL | File-only |
| Studio | Connection copy + scheme badge |

## Phases

| # | Card | Hat | Status |
|---|------|-----|--------|
| 1 | [[01-contract]] | mimir / heimdall | **done** |
| 2 | [[02-engine-open]] | sindri | **done** |
| 3 | [[03-server-env]] | sindri / heimdall | **done** |
| 4 | [[04-studio-connection]] | apollo | **done** |
| 5 | [[05-verify]] | mimir → docs_man | **done** |

## Definition of done

- [x] `libsql://` opens with token; missing token → `JordUrlError`
- [x] `file:` unchanged without token
- [x] Remote skips mkdir + WAL; server WAL gate uses `urlScheme === "file"`
- [x] `/health` secret-free; Studio Connection updated
- [x] Unit tests; live gated
- [x] As-built [[../../../../tech_space/jord/dialects]]; next = **S0020 (last numbered)**

## Explicitly out

- Replicas · migration wizard · Studio paste-URL · S0020 hard vectors · Redis · Artemis
