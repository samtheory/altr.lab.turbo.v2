---
title: "jord-F0014 — typed developer experience"
feature_id: jord-F0014
description: "jord gen types, typed jord-client builders, React live hooks in a separate package"
created: 2026-10-25
updated: 2026-10-28
tags:
  - feature
  - jord
  - todo
  - jord-F0014
  - phase-03
---

# jord-F0014 — typed developer experience

> **Status:** todo · **Id:** `jord-F0014` (was P2) · Index: [[../INDEX]] · Tasks: [[../../../plan/Jord/phase-03/README]] *(none filed yet)*

## Why

Apps call `/api/v1` with untyped rows. Phase-02 built the client, not the types.

## What

`jord gen types` → TS row types from introspection/OpenAPI. Typed `@altr/jord-client` table builder. React bindings (`useJordQuery`, `useJordLive`) in a **separate** package. First consumer: one Apolyx app screen.

## Acceptance

A column rename breaks the consumer app's typecheck; live hook resyncs on 410.

## Overlap

| Id | Change |
|----|--------|
| [[../done/jord-F0006-apis\|jord-F0006]] | Extend client SDK; do not fork table HTTP |

## Plan tasks

| Task | Est. | Status |
|------|------|--------|
| [[../../../plan/Jord/phase-03/done/S0087-gen-types-cli\|S0087]] — jord gen types | 2–3 h | **done** 2026-11-03 |
| [[../../../plan/Jord/phase-03/done/S0088-typed-client-builder\|S0088]] — typed table builder | 3 h | **done** 2026-11-03 |
| [[../../../plan/Jord/phase-03/done/S0089-react-bindings\|S0089]] — React bindings package | 3 h | **done** 2026-11-03 |

Queue: [[../../../plan/Jord/phase-03/README]].
