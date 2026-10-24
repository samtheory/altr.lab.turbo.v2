---
title: "Phase 3 — server and Studio surfaces"
description: "Health and vector routes expose backend; Studio badges"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0020
  - vectors
---

# Phase 3 — server and Studio surfaces

> Who: **sindri** / **apollo**. Sprint: [[README]].

## Status

**done** (2026-10-24)

## Work

| Surface | Change |
|---------|--------|
| `GET /health` | `vectorBackend` beside dialect and scheme. No URL, no token |
| `GET /vectors/namespaces` | `{ namespaces, backend }` |
| `POST /vectors/:namespace/search` | `{ namespace, backend, hits }` — `backend` is the path that ranked this call |
| Studio | Connection and Vectors use Apolyx `Badge` |

## Done when

- [x] Server test accepts the three backend labels
- [x] No new kit primitive
