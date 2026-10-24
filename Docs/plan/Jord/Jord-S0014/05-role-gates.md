---
title: "Phase 5 — vector role gates"
description: "readonly search; editor upsert/delete; admin namespace ops"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0014
  - vectors
  - auth
---

# Phase 5 — vector role gates

> Who: **heimdall** / **apollo**.

Sprint: [[README]]

## Status

**done** (2026-10-24)

## Matrix

| Action | admin | editor | readonly |
|--------|-------|--------|----------|
| List namespaces / embeddings | ✓ | ✓ | ✓ |
| Search | ✓ | ✓ | ✓ |
| Upsert / delete | ✓ | ✓ | ✗ |

Helpers: `canWriteVectors` (= write records), optional `canManageVectors` only if we add namespace wipe (admin).

## Done when

- [ ] 403 on forbidden mutate; Studio hides controls
