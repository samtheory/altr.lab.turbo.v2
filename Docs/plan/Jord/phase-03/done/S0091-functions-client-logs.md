---
title: "S0091 — Functions principal-bound client + logs"
description: "In-worker Jord client that acts as the invoking principal through policies, with invocation logs written via LogSink / jord_logs"
created: 2026-10-28
updated: 2026-11-11
tags:
  - plan
  - jord
  - phase-03
  - task
  - S0091
  - done
---

# S0091 — Functions principal-bound client + logs

> **Status:** **done** 2026-11-11 · **Phase:** [[../README]] · Parent: [[../../../../feature_list/Jord/todo/jord-F0015-functions-runtime|jord-F0015]] · After ship: [[../../../../tech_space/jord/apis/README]] · Depends: [[S0090-functions-worker-pool|S0090]]

## Routing (who / how long / which model)

| | |
|--|--|
| **Suggested agent** | mimir → **sindri** · **heimdall** reviews the policy boundary |
| **Companion skills** | `.agents/skills/security-and-hardening/` · `.agents/skills/graft/` |
| **Suggested model** | `claude-sonnet-5-5-high` |
| **Est. time** | **3 h** (after the gate opens) |
| **Parallel?** | **No** |

## Gate

Lifted with S0090 (2026-11-11).

## Done when

- [x] Function writes/reads respect the invoking principal's policies (tested)
- [x] No admin escape hatch on the in-worker client
- [x] Every invocation writes a log row with status + duration
- [x] Logs contain no secret values
- [x] Proof pasted

## Proof

| Date | Command | Result |
|------|---------|--------|
| 2026-11-11 | `pnpm --filter @altr/jord-server exec vitest run src/functions/pool.test.ts src/functions/principal-client.test.ts` | **15 passed** (policy deny for user, service allow, redacted console logs, RPC allowlist) |
| 2026-11-11 | `pnpm --filter @altr/jord-server typecheck` | clean |

## What shipped

| Piece | Fact |
|-------|------|
| Worker bridge | `user-worker.cjs` passes `{ jord }` as second arg; `jord.from(table).select/insert` + `signBlob` RPC to parent; console capture (no parent stdout forward) |
| Parent RPC | `principal-client.ts` — `evaluatePolicies` with `bypass: false`; records select/insert + blob.sign only; no admin/SQL |
| Logs | `invocation-log.ts` — `source: "function"`, redacts Bearer/JWT/SECRET-shaped lines, bounded lines; written on every invoke outcome including timeout/OOM |
| LogSource | `jobs/log-ring.ts` adds `"function"` |

## After ship

| Update | Path |
|--------|------|
| tech_space | `Docs/tech_space/jord/apis/README.md` |
| Queue | [[../README]] |
