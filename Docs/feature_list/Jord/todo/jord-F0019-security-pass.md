---
title: "jord-F0019 — security pass"
feature_id: jord-F0019
description: "Authorized Strix pentest, key-rotation runbook, dependency audit in CI"
created: 2026-10-25
updated: 2026-10-28
tags:
  - feature
  - jord
  - todo
  - jord-F0019
  - phase-03
---

# jord-F0019 — security pass

> **Status:** todo · **Id:** `jord-F0019` (was P7) · Index: [[../INDEX]] · Threat model: [[../../../plan/Jord/phase-02/Jord-S0021/ADR-threat-model]]

## What

Authorized Strix pentest of `/api/v1`, `/auth`, `/blobs`, `/realtime` (heimdall) · JWT/HMAC/blob-signing key-rotation runbook · dependency audit in CI.

## Acceptance

Findings triaged into cards; no open high/critical.

## Overlap

| Id | Change |
|----|--------|
| [[../done/jord-F0005-auth\|jord-F0005]] | Key rotation must not break principals |
| [[../done/jord-F0006-apis\|jord-F0006]] | Harden public surfaces without weakening F10 |

## Plan tasks

| Task | Est. | Status |
|------|------|--------|
| [[../../../plan/Jord/phase-03/S0092-strix-pentest\|S0092]] — authorized Strix pentest + triage | 2–3 h | todo |
| [[../../../plan/Jord/phase-03/done/S0093-key-rotation-runbook\|S0093]] — key-rotation runbook | 2–3 h | **done** 2026-11-03 |
| [[../../../plan/Jord/phase-03/done/S0094-dependency-audit-ci\|S0094]] — dependency audit in CI | 45–75 min | **done** 2026-11-03 (9 findings open) |

Queue: [[../../../plan/Jord/phase-03/README]].
