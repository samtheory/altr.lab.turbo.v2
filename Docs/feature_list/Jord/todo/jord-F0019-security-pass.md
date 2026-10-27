---
title: "jord-F0019 — security pass"
feature_id: jord-F0019
description: "Authorized Strix pentest, key-rotation runbook, dependency audit in CI"
created: 2026-10-25
updated: 2026-10-27
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
