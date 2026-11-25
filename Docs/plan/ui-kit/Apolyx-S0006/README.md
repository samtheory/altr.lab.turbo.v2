---
title: "plan/ui-kit — Apolyx-S0006 sprint"
description: "Sprint Apolyx-S0006: PasswordRules, OTP chrome, SubscribeField, Dropzone, avatar chrome, empty state, badges"
created: 2026-11-25
updated: 2026-11-25
tags:
  - plan
  - ui-kit
  - apolyx
  - sprint
  - Apolyx-S0006
  - readme
---

# plan / ui-kit — Apolyx-S0006

> Who: **apollo** executes cards; **docs_man** closes the sprint. Intent: [[../../../feature_list/ui-kit/07-apolyx-s0006-nextui-wave]]. Previous: [[../Apolyx-S0005/README]].

**Sprint id:** `Apolyx-S0006`  
**Status:** done — 2026-11-25 · **Owner:** apollo · **Docs steward:** docs_man  
**Parent feature:** apolyx-F0009

## Goal

Ship the first NextUI-inspired wave: forms polish, Dropzone, avatar chrome, and badge ornaments. Clear stale docs `new` badges; mark only S0006 surfaces as `new`.

## Phases

| # | Card | Delivers | Status |
|---|------|----------|--------|
| 1 | [[01-badge-reset]] | Clear old `new`; prepare docs-config for S0006 | done |
| 2 | [[02-password-otp-subscribe]] | PasswordRules, InputOTPField/Resend, SubscribeField | done |
| 3 | [[03-dropzone]] | Dropzone single/multi + DnD + progress | done |
| 4 | [[04-avatar-empty-badges]] | AvatarGroup, AvatarStatus, EmptyState, PriceBadge, QrBadge, Stamp | done |
| 5 | [[05-docs-registry-verify]] | Exports, registry, Storybook, MDX, demos, tests | done |

## Plan-level decisions

1. NextUI is reference only — Apolyx tokens, motion, and global names.
2. Extend PasswordInput / InputOTP / Avatar; do not fork.
3. Dropzone is controlled; the app owns upload I/O.
4. Agent UIs and marketing blocks wait for S0009–S0010.
