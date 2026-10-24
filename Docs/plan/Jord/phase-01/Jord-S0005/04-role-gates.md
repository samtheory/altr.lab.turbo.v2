---
title: "Phase 4 — role gates in Studio + server"
description: "Enforce admin/editor/readonly on UI actions and confirm server 403 paths"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - jord
  - Jord-S0005
  - auth
---

# Phase 4 — role gates in Studio + server

> Who: **apollo** (UI) · **heimdall** (server denial paths). Depends on [[02-server-auth]] + [[03-studio-session]].

Sprint index: [[README]]

## Status

**done** (2026-10-21)

## Behavior

| Role | Studio UX |
|------|-----------|
| `readonly` | Browse tables / schema; Insert / edit / ADD COLUMN disabled or hidden with clear reason |
| `editor` | Full records CRUD; schema visualizer read-only (no ADD COLUMN) |
| `admin` | Records + ADD COLUMN live save |

1. Session exposes role to the shell (header strip or Help → Session).
2. Disable or soft-block actions client-side for clarity; **server remains source of truth** (403).
3. Update `STUDIO_NAV`: Roles / Session entry reflects S3 (live “who am I”); keep Policies as S7.
4. Manual + automated checks for each role.

## Tasks

- [ ] Role-aware chrome (badge / session page)
- [ ] Gate Insert / PATCH / ADD COLUMN controls
- [ ] Confirm jord-server returns 403 for role violations (tests from card 2 still green)
- [ ] Nav + copy cleanup (retire “Local lab gate only” language where obsolete)

## Done when

A `readonly` session cannot complete a write through the UI, and a forged BFF call still fails at jord-server with **403**. `editor` cannot ADD COLUMN. `admin` can.
