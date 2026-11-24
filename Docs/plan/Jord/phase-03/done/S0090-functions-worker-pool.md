---
title: "S0090 — Functions worker pool + timeout/memory caps"
description: "worker_threads pool with per-invocation timeout and memory limit per the accepted ADR"
created: 2026-10-28
updated: 2026-11-11
tags:
  - plan
  - jord
  - phase-03
  - task
  - S0090
  - done
---

# S0090 — Functions worker pool + caps

> **Status:** **done** 2026-11-11 · **Phase:** [[../README]] · Parent: [[../../../../feature_list/Jord/todo/jord-F0015-functions-runtime|jord-F0015]] · ADR: [[../../../../tech_space/jord/apis/ADR-functions-v2]] · After ship: [[../../../../tech_space/jord/apis/README]]

## Routing (who / how long / which model)

| | |
|--|--|
| **Suggested agent** | mimir → **sindri** · **heimdall** reviews the isolation boundary |
| **Companion skills** | `.agents/skills/graft/` · `.agents/skills/nodejs-backend-patterns/` · `.agents/skills/security-and-hardening/` |
| **Suggested model** | `claude-sonnet-5-5-high` |
| **Est. time** | **3 h** (after the gate opens) |
| **Parallel?** | **No** |

## Gate

**Lifted 2026-11-11** in [[../../../../report/STATUS]] (explicit user approval via mimir).

## Goal

A `worker_threads` pool that executes a user function in isolation with a hard timeout, a memory cap, a per-project concurrency limit, and a clean kill path (`terminate()` on timeout), replacing the phase-01 built-in kinds-only path for user code.

## Done when

- [x] Infinite loop killed at the configured timeout (tested)
- [x] Memory cap enforced
- [x] `process.env` secrets not reachable in the worker (tested)
- [x] Built-in kinds unaffected
- [x] Proof pasted

## Proof

| Date | Command | Result |
|------|---------|--------|
| 2026-11-11 | `pnpm --filter @altr/jord-server exec vitest run src/functions/pool.test.ts` | **10 passed** (timeout kill, OOM/crash under 16 MB cap, recovery, env allowlist, moduleRoots deny, built-in runner import) |
| 2026-11-11 | `pnpm --filter @altr/jord-server typecheck` | clean |

## What shipped

| Piece | Fact |
|-------|------|
| Pool | `cloud/jord/src/functions/pool.ts` — warm `worker_threads` pool, queue + 429 when saturated, recycle after N invokes, `terminate()` on wall-clock timeout |
| Caps | `pool-limits.ts` — timeout (default 5 s, hard 60 s), `resourceLimits.maxOldGenerationSizeMb` (default 64, hard 512), max JSON output 1 MiB |
| Bootstrap | `user-worker.cjs` — fixed entry; loads modules only under `moduleRoots`; allowlisted `env` only (plus OS-minimal keys) |
| Errors | `function_timeout` 504 · `function_oom` 503 · `function_crashed` 500 · `function_module_denied` 400 · `pool_saturated` 429 |
| Built-ins | `runner.ts` / step kinds unchanged |

## After ship

| Update | Path |
|--------|------|
| tech_space | `Docs/tech_space/jord/apis/README.md` |
| Queue | [[../README]] |
