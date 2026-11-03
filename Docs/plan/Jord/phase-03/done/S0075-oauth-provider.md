---
title: "S0075 — one OAuth provider (state + PKCE)"
description: "OAuth 2.0 authorization-code with PKCE and state: authorize, callback, account link, and errors that cannot be used for enumeration"
created: 2026-10-28
updated: 2026-11-03
tags:
  - plan
  - jord
  - phase-03
  - task
  - S0075
  - done
---

# S0075 — one OAuth provider (state + PKCE)

> **Status:** **done** 2026-11-03 · **Phase:** [[../README]] · Parent: [[../../../../feature_list/Jord/todo/jord-F0016-auth-v2|jord-F0016]] · After ship: [[../../../../tech_space/jord/auth/README]]

## Routing (who / how long / which model)

| | |
|--|--|
| **Suggested agent** | mimir → **heimdall** |
| **Companion skills** | `.agents/skills/security-and-hardening/` · `.agents/skills/graft/` · `.agents/skills/hono-typescript/` |
| **Suggested model** | `claude-sonnet-5-5-high` |
| **Est. time** | **3 h** |
| **Parallel?** | **No** |

## Goal

One OAuth 2.0 provider (Google first, generic OIDC if cheap) end to end: `GET /auth/oauth/:provider` redirects with `state` + PKCE challenge, `/auth/oauth/:provider/callback` validates state, exchanges the code, upserts the identity, and issues a session. Client id/secret come from project settings (write-only), callback URL is fixed and documented.

## Why now

`jord-F0016` scopes OAuth to **one** provider on purpose; the console's OAuth card (`S0071`) is gated until this exists.

## Context (read before coding)

| Kind | Where |
|------|-------|
| Intent | [[../../../../feature_list/Jord/todo/jord-F0016-auth-v2|jord-F0016]] · [[../../../../feature_list/Jord/todo/jord-F0030-auth-console|jord-F0030]] (Providers) |
| Depends on | [[S0069-auth-settings-store|S0069]] (provider settings + allowlist) · [[S0071-auth-console-sections|S0071]] (secret storage) |
| Code today | `cloud/jord/src/auth/{identity,routes,jwt,admin}.ts` |
| Tests | `cloud/jord/src/auth/principals.test.ts` (add oauth cases) |

**Do not break:** local password login; enumeration safety on link conflicts; no client secret in any response.

## In scope

- Authorize: random `state` (stored, single-use, 10 min) + PKCE `code_verifier`/`challenge` (S256); redirect URI derived from the configured site URL.
- Callback: state check, code exchange with timeout, id_token/userinfo validation (issuer, audience, `email_verified`), identity upsert by provider + subject.
- Linking: existing email + new provider → link only after a verified email and an explicit policy (state which; default link when `email_verified`).
- Errors: single generic failure page/code; no "account exists" leakage.
- Settings: provider enable toggle + client id/secret via the secret store; disable immediately rejects authorize.
- Tests: state mismatch rejected, replay rejected, PKCE verifier mismatch rejected, disabled provider rejected, happy path with a stubbed provider.

## Out of scope

More than one provider · OIDC discovery for arbitrary issuers · refresh tokens from the provider · SAML.

## Diagram

```mermaid
sequenceDiagram
  participant U as User
  participant J as Jord
  participant P as Provider
  U->>J: GET /auth/oauth/google
  J-->>U: 302 with state + PKCE
  U->>P: consent
  P-->>J: callback ?code&state
  J->>P: token exchange (verifier)
  J->>J: upsert identity + session
  J-->>U: redirect to allowlisted URL
```

## Steps (do in order)

1. Read identity/upsert + settings; decide the linking policy and write it down in the card before coding.
2. Implement state + PKCE storage.
3. Implement authorize + callback + identity upsert.
4. Add provider settings enable/disable + secret read.
5. Stubbed-provider tests for each guard.
6. Typecheck + test; paste proof.
7. **docs_man**: auth tech_space OAuth section; tick card.

## Done when

- [x] Happy path signs in with a stubbed provider
- [x] State mismatch/replay and PKCE mismatch rejected (tested)
- [x] Disabled provider refuses immediately
- [x] No account-existence leakage on errors
- [x] Proof pasted

## Proof

| Date | Command | Result |
|------|---------|--------|
| 2026-11-03 | `pnpm --filter @altr/jord-server test` | **238 passed** \| 20 skipped (was 225; +13 oauth) |
| 2026-11-03 | `pnpm --filter @altr/jord-server exec tsc --noEmit` | clean |
| 2026-11-03 | `vitest run src/auth` (after heimdall fixes) | **65 passed** |

## What shipped

| Piece | Fact |
|-------|------|
| Routes | `GET /auth/oauth/:provider` (302 with `state` + S256 PKCE) · `GET /auth/oauth/:provider/callback` · admin `GET`/`PUT /admin/auth/oauth/:provider` |
| Provider | `google` only; endpoints constant, `fetch` injectable for tests. `redirect_uri` = `site_url` + `/auth/oauth/google/callback` (site URL required, else 503) |
| Storage | migration `0021_oauth`: `jord_oauth_providers` (client secret sealed with the master key, write-only), `jord_oauth_states` (sha256, single use, 10 min), `jord_identities` (unique provider + subject) |
| State | claimed by `UPDATE … RETURNING` (Postgres-safe); bound to the browser by an HttpOnly `SameSite=Lax` cookie (login-CSRF guard); expired rows swept on each authorize |
| id_token | `iss` / `aud` / `exp` / `sub` / `email_verified` checked; signature skipped because it arrives straight from the TLS token endpoint (OIDC Core 3.1.3.7) |
| Errors | every callback failure is the same `400 {error:"oauth_failed"}`; disabled users and closed sign-ups are indistinguishable |
| Session | JSON session, or 302 to the allowlisted `redirect_to` with tokens in the URL **fragment** |

**Linking policy (decided before coding):** match by (provider, subject). With no identity yet, a **verified** email that matches an existing user links to it; with no such user a confirmed user is created while sign-ups are enabled. An unverified email never links or creates. Linking an account that was **unconfirmed** strips its password and revokes its refresh tokens (pre-registration takeover guard).

**Known / follow-up (heimdall review, not fixed):** secret write and DB upsert are not atomic and the port's sealed map is in-memory, so after a restart a stored secret may not unseal (callback fails generically; re-enter the secret); token response has no size cap or `redirect:"error"`; a second Google `sub` with the same verified email links as another identity on one user (recycled-address risk); per-IP limits trust `x-forwarded-for`.

## After ship

| Update | Path |
|--------|------|
| tech_space | `Docs/tech_space/jord/auth/README.md` |
| Queue | [[../README]] |
