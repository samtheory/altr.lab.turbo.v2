---
title: "jord-F0015 — Functions v2 runtime"
feature_id: jord-F0015
description: "Implement worker_threads Functions runtime per ADR; principal-bound client; timeout/memory caps"
created: 2026-10-25
updated: 2026-10-28
tags:
  - feature
  - jord
  - todo
  - jord-F0015
  - phase-03
---

# jord-F0015 — Functions v2 runtime

> **Status:** todo · **Id:** `jord-F0015` (was P3) · Index: [[../INDEX]] · ADR: [[../../../tech_space/jord/apis/ADR-functions-v2]]

## Why

ADR accepted; Functions are still phase-01 built-in kinds only.

## What

`worker_threads` pool, timeout + memory cap, scoped Jord client inside the worker (principal-bound, through policies), logs to `jord_logs`.

## Acceptance

Infinite loop killed at timeout; worker cannot read env secrets; writes respect policies.

## Overlap

| Id | Change |
|----|--------|
| [[../done/jord-F0006-apis\|jord-F0006]] | F8 ADR → runtime |
| [[../done/jord-F0008-policies\|jord-F0008]] | Worker must use same policy path |
| [[../done/jord-F0012-studio\|jord-F0012]] | Function editor targets new runtime |

## Plan tasks

| Task | Est. | Status |
|------|------|--------|
| [[../../../plan/Jord/phase-03/S0090-functions-worker-pool\|S0090]] — worker pool + caps (GATED) | 3 h | todo |
| [[../../../plan/Jord/phase-03/S0091-functions-client-logs\|S0091]] — principal-bound client + logs (GATED) | 3 h | todo |

Queue: [[../../../plan/Jord/phase-03/README]].
