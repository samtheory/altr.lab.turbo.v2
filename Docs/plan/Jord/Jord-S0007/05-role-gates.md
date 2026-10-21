---
title: "Phase 5 — job manage role gates"
description: "canManageJobs admin-only; Studio disable manage controls for editor/readonly"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - jord
  - Jord-S0007
  - auth
---

# Phase 5 — job manage role gates

> Who: **heimdall** (server) · **apollo** (Studio UI).

Sprint index: [[README]] · S3 as-built: [[../../../tech_space/jord/04-s0005-auth]]

## Status

**done** (2026-10-21)

## Matrix

| Action | readonly | editor | admin |
|--------|----------|--------|-------|
| GET jobs / runs / logs | yes | yes | yes |
| POST/PATCH/DELETE jobs | 403 | 403 | yes |
| POST run-now | 403 | 403 | yes |

## Tasks

- [ ] `canManageJobs` + `requireManageJobs` on server (+ Studio mirror)
- [ ] Server tests for 403 matrix
- [ ] Studio: hide/disable create / toggle / run-now / delete for non-admin
- [ ] `/help` capability row

## Done when

Role matrix proven by tests; Studio matches.
