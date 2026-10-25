---
title: "Jord-S0026 — Functions v2 (plan / ADR only)"
description: "Evaluate TS handlers vs worker_threads vs isolated-vm; recommend worker_threads; do not implement without approval"
created: 2026-10-24
updated: 2026-10-25
tags:
  - plan
  - jord
  - Jord-S0026
  - phase-02
  - functions
  - adr
---

# Jord-S0026 — Functions v2 (plan only)

> Who: **mimir**. **Status: done (ADR written, 2026-10-25).** **Execution #12.** **No product blocker.** No product code in this card. Runtime waits on a follow-up sprint after ADR approval for implementation.

**Sprint id:** `Jord-S0026`  
**Hats:** **sindri** · **heimdall** · **docs_man**

## Goal

Choose a safe execution model for user TypeScript handlers. Write the decision; ship no runtime until approved.

## Evaluate

| Option | Notes |
|--------|-------|
| (a) Registered TS handlers from a directory | Simple; weak isolation |
| (b) `worker_threads` + timeout + restricted context | **Default recommendation** |
| (c) `isolated-vm` | **Rejected.** Native/node-gyp build. Not a candidate |

## Deliverable

- Short ADR under `Docs/tech_space/jord/apis/` with risks, timeout model, and what stays out (arbitrary network, filesystem) — **shipped:** [[../../../tech_space/jord/apis/ADR-functions-v2]]
- Update [[../../../../feature_list/Jord/03-phase-02-features]] F8 acceptance
- **No code path for user workers until a follow-up sprint is approved**

## Out of scope

Implementation · picking (c) · Bun

## Definition of Done

- [x] Written recommendation defaults to (b) with risk analysis
- [x] Explicit “do not implement” gate recorded in STATUS

## As-built

- ADR: [[../../../tech_space/jord/apis/ADR-functions-v2]]
- Linked from [[../../../tech_space/jord/apis/README]]
- **No vitest / runtime tests** — ADR-only card; no worker pool or loader code
