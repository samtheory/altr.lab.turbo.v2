---
title: "Phase 4 — Studio Connection copy"
description: "Document libsql:// + token env; optional urlScheme badge; no secrets UI"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0019
  - apollo
  - jord-studio
---

# Phase 4 — Studio Connection copy

> Who: **mimir → apollo**. Apolyx-first. Sprint: [[README]].

## Status

**done** (2026-10-24)

## Touch

| File | Change |
|------|--------|
| `apps/jord-studio/src/components/connection-panel.tsx` | Copy: `libsql://` + `LIBSQL_AUTH_TOKEN` / `TURSO_AUTH_TOKEN`; optional `urlScheme` badge |
| Studio `.env.example` (if any) | Point at server env only |

## UX (locked)

- Still **read-only** Connection: dialect (+ optional scheme) from `/health`.
- No paste field for URL or token (deferred carryover from S0010).
- Wording: restart jord-server after changing process env.

## Apolyx

Compose existing `Alert`, `Badge` only. No new kit primitives.

## Done when

- [ ] Operator can tell file vs hosted libSQL without seeing secrets
- [ ] Browser never receives URL/token
