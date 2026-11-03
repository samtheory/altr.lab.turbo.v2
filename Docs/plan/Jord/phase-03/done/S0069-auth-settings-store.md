---
title: "S0069 — auth settings store + config API"
description: "Per-project auth configuration (sign-up, autoconfirm, password policy, URL allowlist, rate limits, session TTL) stored and enforced by the server"
created: 2026-10-28
updated: 2026-11-03
tags:
  - plan
  - jord
  - phase-03
  - task
  - S0069
  - done
---

# S0069 — auth settings store + config API

> **Status:** **done** 2026-11-03 · **Phase:** [[../README]] · Parent: [[../../../../feature_list/Jord/todo/jord-F0030-auth-console|jord-F0030]] · After ship: [[../../../../tech_space/jord/auth/README#auth-settings-store-s0069|Auth as-built]]

## Routing (who / how long / which model)

| | |
|--|--|
| **Suggested agent** | mimir → **heimdall** (auth surface) + **sindri** (routes) |
| **Companion skills** | `.agents/skills/graft/` · `.agents/skills/security-and-hardening/` · `.agents/skills/hono-typescript/` |
| **Suggested model** | `claude-sonnet-5-5-high` |
| **Est. time** | **2.5–3 h** |
| **Parallel?** | **No** — the console sections read this document |

## Goal

One `jord_auth_settings` document per project with `GET/PATCH /admin/auth/settings`: sign-ups enabled, autoconfirm, password policy, site URL, redirect allowlist, per-endpoint rate limits, session lifetime. Server behavior reads the settings — a disabled sign-up actually fails, not just hides a form.

## What shipped

| Piece | Fact |
|-------|------|
| Migration | `0016_auth_settings` (libSQL + Postgres) → `jord_auth_settings`, one row `id=default` |
| Schema | `elements/jord/src/schema/auth-settings.ts` (`jordAuthSettings`, `DEFAULT_AUTH_SETTINGS`, bounds, rate-limit keys) |
| Loader | `cloud/jord/src/auth/settings.ts` — `loadAuthSettings`: missing row ⇒ today's behavior; malformed JSON/ints fall back per field |
| API | `GET/PATCH /admin/auth/settings` (`settings-routes.ts`, mounted under `/admin/auth`) — operator admin only; strict validation rejects unknown keys; returns `changed` |
| Audit | Each successful patch writes `jord_logs` `source=auth.settings` with actor + changed keys; audit failure never blocks the save |
| Signup gate | `signups_enabled=false` → **403** `signups_disabled` |
| Autoconfirm | Insert `email_confirmed=1` and skip the confirm token + mail |
| Password policy | `password_min_length` (6–128, default 10) enforced on signup **and** reset; default keeps the phase-01 rule (never equal the email) |
| Redirects | `site_url` + `redirect_allowlist` (absolute http(s) patterns, `*` = one segment, `**` = anything). Fail closed: no config ⇒ any `redirect_to` is **400** `redirect_not_allowed` |
| Rate limits | Per-endpoint `rate_limits` (signup/signin/refresh/recover/reset/confirm) on the S0036 `RateLimitStore` (Postgres shared / memory); limiter outage allows rather than blocks |
| Session TTL | `session_ttl_seconds` (60–86 400, default 900) drives access-token `exp` and `expires_in` on signin/refresh |
| Route inventory | `/admin/auth/*` declares a distinct `admin auth` surface |
| Defaults | signups on · autoconfirm off · min length 10 · no site URL/allowlist · 30/min per auth endpoint · 900 s TTL |

## Done when

- [x] Settings persist per project and reload (GET after PATCH)
- [x] Disabled sign-up returns an error from the server (403, tested)
- [x] Off-allowlist redirect rejected (protocol-relative and cross-origin tested)
- [x] Rate-limit changes take effect (signup limit 1 → second call 429)
- [x] Proof pasted

## Proof

| Date | Command | Result |
|------|---------|--------|
| 2026-11-03 | `pnpm --filter @altr/jord-server exec vitest run src/auth/settings.test.ts` | **7 passed** · exit 0 |
| 2026-11-03 | `pnpm --filter @altr/jord-server test` | **195 passed** \| 20 skipped (31 files + 1 skipped) · exit 0 |
| 2026-11-03 | `pnpm --filter @altr/jord test` | **138 passed** \| 12 skipped (32 files + 1 skipped) · exit 0 |
| 2026-11-03 | `pnpm --filter @altr/jord exec tsc --noEmit` · `pnpm --filter @altr/jord-server exec tsc --noEmit` | exit 0 |

## After ship

| Update | Path |
|--------|------|
| tech_space | `Docs/tech_space/jord/auth/README.md` |
| Queue | [[../README]] |
