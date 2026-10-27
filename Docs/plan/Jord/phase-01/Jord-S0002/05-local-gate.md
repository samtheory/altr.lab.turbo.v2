---
title: "Phase 5 — local-dev gate"
description: "Visible local-only banner; no production auth in S1"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - jord
  - Jord-S0002
---

# Phase 5 — local-dev gate

> Who: **apollo**. Real auth is Studio S3.

Sprint index: [[README]] · Intent: [[../../../../feature_list/Jord/done/jord-F0012-studio]]

## Status

**done** (2026-10-21)

## Behavior

- Persistent banner or chrome: Studio is **local / lab only** (not multi-tenant, not production)
- Optional: if `JORD_STUDIO_OPEN` is not `1`, show a blocked screen telling the operator to set the env (keeps accidental deploys dumb). Default for local README: set `JORD_STUDIO_OPEN=1`
- No password, OAuth, or roles in this sprint

## Done when

A cold visitor sees either the local-open Studio or an explicit “set JORD_STUDIO_OPEN=1” gate — never a silent production-looking admin with no warning.

Shipped: `LocalBanner` + `JORD_STUDIO_OPEN=1` gate in root layout.
