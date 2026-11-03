---
title: "S0072 — email templates + test send"
description: "Confirm/magic-link/reset/invite templates with variables, sender identity, and a test send that proves the mailer path end to end"
created: 2026-10-28
updated: 2026-11-03
tags:
  - plan
  - jord
  - phase-03
  - task
  - S0072
  - done
---

# S0072 — email templates + test send

> **Status:** **done** 2026-11-03 · Real delivery: [[S0073-mailer-port|S0073]] · **Phase:** [[../README]] · Parent: [[../../../../feature_list/Jord/todo/jord-F0030-auth-console|jord-F0030]] · After ship: [[../../../../tech_space/jord/auth/README]]

## Routing (who / how long / which model)

| | |
|--|--|
| **Suggested agent** | mimir → **apollo** (UI) + **sindri** (render + send path) |
| **Companion skills** | `.agents/skills/apollo/` · `.agents/skills/security-and-hardening/` |
| **Suggested model** | `gpt-5.6-sol-medium` |
| **Est. time** | **2–3 h** |
| **Parallel?** | **No** |

## Goal

An **Email** section: subject + body per template (confirm sign-up, magic link, password reset, invite), variable list with insert affordance, sender name/address, and **Send test** that delivers through the configured mailer with the real template rendering.

## What shipped

| Piece | Fact |
|-------|------|
| Storage | Migration `0019_auth_email` → `email_templates` + `email_sender` JSON on `jord_auth_settings` |
| Templates | Four keys (`confirm` · `magic_link` · `reset` · `invite`); `{{email,token,link,expires_in,project,app_name}}`; HTML escapes substitutions |
| Runtime | Signup / invite / recover use `sendAuthEmail` (template render → `MailerPort`) |
| Admin HTTP | `POST /admin/auth/email/send-test` (admin, rate-limited, audited); settings PATCH accepts templates + sender; `email_provider` exposed on GET |
| Studio | Auth → Email: editor, variable chips, preview, reset, sender identity, test send; console-mailer warning when `provider=console` |
| Tests | Escape + unknown vars; stub mailer message id; provider failure 502; admin-only; studio unit tests |

## Done when

- [x] Four templates editable, previewable and resettable
- [x] Test send delivers via the configured mailer and reports the message id
- [x] Without a provider, the section says so plainly
- [x] Variables are escaped (tested)
- [x] Proof pasted

## Proof

| Date | Command | Result |
|------|---------|--------|
| 2026-11-03 | `pnpm --filter @altr/jord-server test` | **210 passed** \| 20 skipped (35 files + 1 skipped) |
| 2026-11-03 | `pnpm --filter @altr/jord-server exec tsc --noEmit` | clean |
| 2026-11-03 | `pnpm --filter @altr/jord-studio exec tsc --noEmit` | clean |
| 2026-11-03 | `pnpm --filter @altr/jord-studio exec node --import tsx --test src/lib/studio-auth-email.test.ts` | **6 passed** |

## After ship

| Update | Path |
|--------|------|
| tech_space | `Docs/tech_space/jord/auth/README.md` · studio Auth console |
| Queue | [[../README]] |
