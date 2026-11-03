---
title: "S0073 — real MailerPort (HTTP email provider)"
description: "Replace the console mailer with a real provider behind the existing MailerPort, env-configured, with failure and bounce handling"
created: 2026-10-28
updated: 2026-11-03
tags:
  - plan
  - jord
  - phase-03
  - task
  - S0073
  - done
---

# S0073 — real MailerPort

> **Status:** **done** 2026-11-03 · **Phase:** [[../README]] · Parent: [[../../../../feature_list/Jord/todo/jord-F0016-auth-v2|jord-F0016]] · After ship: [[../../../../tech_space/jord/auth/README]]

## Routing (who / how long / which model)

| | |
|--|--|
| **Suggested agent** | mimir → **sindri** · **heimdall** reviews what leaves the process |
| **Companion skills** | `.agents/skills/graft/` · `.agents/skills/hono-typescript/` · `.agents/skills/security-and-hardening/` |
| **Suggested model** | `claude-sonnet-5-5-high` |
| **Est. time** | **2–3 h** |
| **Parallel?** | **No** — S0074/S0072 build on real delivery |

## Goal

`MailerPort` gets a real adapter (HTTP transactional email API, provider chosen at implementation between the two the feature names: Resend or SES) configured by env, with timeouts, one retry on 5xx, and a typed failure the caller can react to. The console adapter stays for local dev and is selected explicitly.

## What shipped

| Piece | Fact |
|-------|------|
| Boot | `createMailerFromEnv` — `JORD_MAILER=console\|resend\|ses` (default console); missing provider keys refuse boot |
| Resend | `fetch` → `POST /emails`, Bearer API key, 5 s timeout, one retry on 5xx/429/network/timeout |
| SES | SigV4 Query API `SendEmail` via `fetch` (no AWS SES SDK), same timeout/retry |
| Errors | `MailerError` with `code` (`invalid_credentials` · `provider_error` · `timeout` · `network` · `config`) + `providerStatus` |
| Test send | `POST /admin/auth/email/send-test` returns `code` + `provider_status` on 502 |
| Config | `.env.example` + `load-env.ts` knobs; keys never in DB/UI |
| Tests | Stubbed HTTP: 200 message id, 401 credentials, 5xx retry-then-fail, network retry, SES XML `MessageId` |

## Done when

- [x] Console mode still the default with no config
- [x] Real provider adapters proven via stubbed HTTP (live Resend/SES smoke is operator-gated — set `JORD_MAILER` + keys locally)
- [x] 401 from the provider surfaces as invalid credentials, not a crash
- [x] 5xx retried once, then reported
- [x] Proof pasted

## Proof

| Date | Command | Result |
|------|---------|--------|
| 2026-11-03 | `pnpm --filter @altr/jord-server test` | **217 passed** \| 20 skipped (35 files + 1 skipped) |
| 2026-11-03 | `pnpm --filter @altr/jord-server exec tsc --noEmit` | clean |
| 2026-11-03 | `pnpm --filter @altr/jord-server exec vitest run src/auth/mailer.test.ts` | **9 passed** (console · boot · 200 · 401 · 5xx · network · SES) |

## After ship

| Update | Path |
|--------|------|
| tech_space | `Docs/tech_space/jord/auth/README.md` |
| Queue | [[../README]] |
