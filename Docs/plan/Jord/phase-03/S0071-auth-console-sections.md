---
title: "S0071 — Auth console: providers, URL config, JWT, rate limits"
description: "Provider enable/credentials forms, redirect allowlist editor, JWT key/expiry/claims editor with decoded preview, and rate-limit controls"
created: 2026-10-28
updated: 2026-10-28
tags:
  - plan
  - jord
  - phase-03
  - task
  - S0071
---

# S0071 — Auth console: providers, URL config, JWT, rate limits

> **Status:** todo · **Depends on** [[S0070-auth-console-users|S0070]] + [[S0069-auth-settings-store|S0069]] · **Phase:** [[README]] · Parent: [[../../../feature_list/Jord/todo/jord-F0030-auth-console|jord-F0030]] · After ship: [[../../../tech_space/jord/studio/README]]

## Routing (who / how long / which model)

| | |
|--|--|
| **Suggested agent** | mimir → **apollo** (UI) + **heimdall** (secret + JWT surface) |
| **Companion skills** | `.agents/skills/apollo/` · `.agents/skills/security-and-hardening/` · `.agents/skills/fix-security-vulnerabilities-with-strix/` |
| **Suggested model** | `claude-sonnet-5-5-high` |
| **Est. time** | **3 h** |
| **Parallel?** | **No** |

## Goal

Four configurable sections that match server capability: **Providers** (email/password, anonymous; magic link + OAuth appear once their server cards land), **URL configuration** (site URL + redirect allowlist with wildcard rules), **JWT** (signing key rotation, access-token expiry, custom claims with decoded-token preview), **Rate limits** (per-endpoint with defaults and reset).

## Why now

These are the sections operators expect from a Supabase-style auth menu; the settings store (S0069) already persists them, so this is the console half plus the secret/JWT endpoints.

## Context (read before coding)

| Kind | Where |
|------|-------|
| Intent | [[../../../feature_list/Jord/todo/jord-F0030-auth-console|jord-F0030]] (Providers, URL, JWT, Rate limits) |
| Depends on | [[S0069-auth-settings-store|S0069]] · [[S0042-control-plane-store-adr|S0042]] secret port |
| Code today | `cloud/jord/src/auth/{jwt,config,admin,route-inventory}.ts` · settings from S0069 |
| Gate | OAuth/magic-link provider forms enable only after [[S0074-magic-link|S0074]] / [[S0075-oauth-provider|S0075]]; until then disabled with the dependency named |

**Do not break:** client secret and signing key are write-only; rotating the JWT key follows the documented invalidation policy; no secret in the browser bundle.

## In scope

- Providers: per-provider card with enabled toggle, client id/secret (masked, write-only), scopes, callback URL display; email/password + anonymous fully functional; others gated.
- URL config: site URL + allowlist rows (exact / wildcard `https://*.example.com`), validation on save, and server-side enforcement already added in S0069 (link the test).
- JWT: rotate signing key (confirm dialog naming the invalidation window), expiry control, custom-claims JSON editor with a decoded preview using a sample principal.
- Rate limits: table of endpoints with current/default/value, reset-to-default, and a save that applies immediately.
- Server endpoints for secrets/keys with audit + role guard; tests for secret non-disclosure and claims preview shape.

## Out of scope

Actual OAuth provider implementations · MFA · SAML/SCIM · per-organization claims.

## Diagram

```mermaid
flowchart LR
  P[Providers] --> S[(settings + secrets)]
  U[URL config] --> S
  J[JWT keys/claims] --> S
  R[Rate limits] --> L[limiter]
  S --> API[auth runtime]
```

## Steps (do in order)

1. Read S0069 settings shape + jwt.ts; list which fields already exist.
2. Add the secret/JWT endpoints with tests for non-disclosure.
3. Build the four sections with gated states where capability is missing.
4. Wire save → immediate effect; show decoded-token preview.
5. Typecheck + build; verify secret absence in the bundle and responses.
6. **docs_man**: auth tech_space sections; tick card.

## Done when

- [ ] Providers/URL/JWT/rate limits all save and reload
- [ ] Secrets never appear in responses or the bundle (asserted)
- [ ] JWT rotation invalidates old tokens per the documented policy
- [ ] OAuth/magic link show gated states, not dead toggles
- [ ] Proof pasted

## Proof

| Date | Command | Result |
|------|---------|--------|
| | `pnpm --filter @altr/jord-studio typecheck` | |
| | `pnpm --filter @altr/jord-server test` | |

## After ship

| Update | Path |
|--------|------|
| tech_space | `Docs/tech_space/jord/auth/README.md` |
| Queue | [[README]] |
