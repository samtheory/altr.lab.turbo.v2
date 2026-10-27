---
title: "jord-F0008 — policies"
feature_id: jord-F0008
description: "Shipped: deny-overrides, rls_enabled, jord_app FORCE RLS, owner/claim row scope"
created: 2026-10-24
updated: 2026-10-27
tags:
  - feature
  - jord
  - done
  - policies
---

# jord-F0008 — policies

> Row access rules. As-built: [[../../../tech_space/jord/policies/README]]. Auth principals: [[jord-F0005-auth]]. Embeds must re-apply these rules (phase-03 P5).

## Phase-01

Middleware policies + triggers UI; native Postgres RLS on `records` — **Done** (S0009 · S0017).

## Phase-02 F3

Deny overrides allow. No policy → default-deny for anon and user. `rls_enabled` per table. UPDATE USING + WITH CHECK. Owner column immutable for non-service. Route inventory test.

Postgres: FORCE RLS + non-owner `jord_app`; grants from `JORD_MIGRATE_URL`; refuse migrate==runtime URL; refuse BYPASSRLS / table-owner runtime role. `SET LOCAL` in-transaction only. Row scope: `owner_eq` / `claim_eq` ORed across matching allows.

**Done** 2026-10-25 (phase-02.5 S0030/S0032). Plan: [[../../../plan/Jord/phase-02/Jord-S0021/README|S0021-C]] · threat model [[../../../plan/Jord/phase-02/Jord-S0021/ADR-threat-model]].
