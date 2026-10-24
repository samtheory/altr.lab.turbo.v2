---
title: "Phase 5 — blob role gates"
description: "Map admin / editor / readonly to blob actions; Studio + server enforcement"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0013
  - blobs
  - auth
  - heimdall
---

# Phase 5 — blob role gates

> Who: **heimdall** · **apollo** (hide forbidden actions in UI).

Sprint index: [[README]] · Contract: [[01-contract]]

## Status

**done** (2026-10-24)

## Goal

Enforce blob permissions the same way as schema/records — server is source of truth; Studio only mirrors.

## Matrix

| Action | `admin` | `editor` | `readonly` |
|--------|---------|----------|------------|
| List buckets | ✓ | ✓ | ✓ |
| Create bucket | ✓ | ✗ | ✗ |
| List objects | ✓ | ✓ | ✓ |
| Download | ✓ | ✓ | ✓ |
| Upload / upsert | ✓ | ✓ | ✗ |
| Delete object | ✓ | ✓ | ✗ |

Choice: dedicated `canManageBlobs` (admin) and `canWriteBlobs` (admin|editor) — not aliased to schema/records helpers.

## Done when

- [x] Server returns 403 for forbidden role on each mutate path
- [x] Studio hides or disables forbidden controls
- [x] Tests cover at least one forbidden + one allowed path
