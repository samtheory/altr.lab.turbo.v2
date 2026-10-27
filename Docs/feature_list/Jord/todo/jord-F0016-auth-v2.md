---
title: "jord-F0016 — auth v2"
feature_id: jord-F0016
description: "Real MailerPort, magic link, one OAuth, Studio policy tester, sessions, custom JWT claims"
created: 2026-10-25
updated: 2026-10-27
tags:
  - feature
  - jord
  - todo
  - jord-F0016
  - phase-03
---

# jord-F0016 — auth v2

> **Status:** todo · **Id:** `jord-F0016` (was P4) · Index: [[../INDEX]]

## What

Real `MailerPort` (Resend or SES) · magic link · one OAuth provider · Studio “run as user” policy tester · session list + revoke · **custom JWT claims** (phase-02.75 B7).

## Acceptance

Enumeration tests still pass; OAuth state/PKCE tested; policy tester matches server decisions on a fixture matrix.

## Overlap

| Id | Change |
|----|--------|
| [[../done/jord-F0005-auth\|jord-F0005]] | Console mail → real provider; extend JWT claims |
| [[../done/jord-F0012-studio\|jord-F0012]] | Policy tester + session UI |
