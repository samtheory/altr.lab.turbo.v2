---
title: "Phase 4 — records OCC"
description: "Insert starts at version 1. Update increments version only when the caller matches it"
created: 2026-10-18
updated: 2026-10-18
tags:
  - plan
  - jord
  - Jord-S0001
---

# Phase 4 — records OCC

> Who: implementer. HTTP 409 is card 6. This card is the library result.

Sprint index: [[README]] · SQL: [[../../../feature_list/Jord/00-intent]]

## Operations

| Op | Behavior |
|----|----------|
| Insert | `id` from `crypto.randomUUID()`, `version` 1, both timestamps set to the same millisecond clock |
| Get by id | Row or not found. Includes `version` |
| List by bucket | Newest `created_at` first. Includes `version` |
| Update | `UPDATE records SET …, version = version + 1, updated_at = ? WHERE id = ? AND version = ?`. If `changes` is 0, return a conflict result and do not write. If 1, return the new version |

The conflict type is a library result (not an HTTP type). Card 6 maps it to 409.

## Tasks

- [ ] Insert / get / list / update helpers on the port
- [ ] Test: two updates with the same version — the second conflicts and the row stays at version 2
- [ ] Test: a matching update bumps `version` and `updated_at`

## Done when

Those two tests pass against a temp `file:` database.
