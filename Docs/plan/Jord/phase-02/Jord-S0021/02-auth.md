---
title: "S0021 Part B — principal auth"
description: "Principal kinds, JWT rules, async scrypt, MailerPort, HMAC operator tokens stay valid"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0021
  - jord-s0021-b
  - auth
  - principal
---

# Part B — principal auth

> Sprint: [[README]]. **Execution #3. Blocked by Part A only.** Stop for review before the ADR is accepted into Part C. Tag: `jord-s0021-b`.

## Status

**planned** (blocked on Part A)

## Principal

One type, used by every later card:

```ts
type Principal = {
  kind: "service" | "user" | "anon" | "operator"
  uid?: string
  role: string
  claims: Record<string, unknown>
}
```

| Kind | Meaning |
|------|---------|
| `operator` | Studio roles `admin` / `editor` / `readonly` |
| `service` | Legacy shared secret presented raw. Role `service_role`. Bypasses user policies |
| `user` | Authenticated end user (`sub` = uid) |
| `anon` | Long-lived anon JWT. No uid |

**Client-facing rule:** operator tokens administer Jord. User and anon tokens are the app's principals. They are not interchangeable. Publish the route table below in the auth category doc when this part ships.

### What each kind may do

Phase-01 operator matrix stays. `service` is the data-plane bypass. `user` and `anon` are default-deny until Part C attaches a policy.

| Route group | operator `admin` | operator `editor` | operator `readonly` | `service` | `user` | `anon` |
|-------------|------------------|-------------------|---------------------|-----------|--------|--------|
| `GET /health` | yes | yes | yes | yes | yes | yes |
| `POST /auth/signup\|signin\|refresh\|recover\|reset\|confirm` | public (rate-limited) | public | public | public | public | public |
| `POST /auth/logout`, `GET /auth/me` | yes if token | yes if token | yes if token | yes | yes | me = anon claims |
| `POST /auth/anon-key` (mint) | yes | no | no | no | no | no |
| `/records`, schema **row** DML | yes | write | read | yes (bypass) | Part C policy | Part C policy |
| Schema **DDL** | yes | no | no | no | no | no |
| Generated API, vectors, blobs | yes | write / read as today | read | yes (bypass) | Part C | Part C |
| `/realtime`, `/realtime/ws` | yes | yes | yes | yes | yes until exp | yes until exp |
| Custom `/x/:slug`, built-in function steps | yes | if role allows | read-only steps | yes | as caller, no escalate | as caller, no escalate |
| Jobs, policies, triggers admin | yes | no | inspect | no | no | no |
| Table API `/api/v1` | when S0022 ships | when S0022 | read | yes | policy | policy |

## JWT

| Rule | Choice |
|------|--------|
| Signing secret | **`JORD_JWT_SECRET`**, separate from the shared service secret and from HMAC |
| Alg | Pin **HS256**. Reject `none` and any other alg |
| Claims | `iss`, `aud`, `sub`, `role`, `iat`, `exp` |
| Header | `kid`. Two active verify keys (`JORD_JWT_SECRET` + `JORD_JWT_SECRET_PREVIOUS`). Sign with the current kid only |
| Access TTL | 15m |
| Clock skew | 60s |
| Anon key | Long-lived JWT, `role=anon`, minted from env secrets via `POST /auth/anon-key` (admin operator). Not stored server-side |

## Passwords and mail

| Piece | Choice |
|-------|--------|
| Hash | **Async** `scrypt` (must not block the event loop). Explicit N/r/p and `maxmem` stored in the hash string. Compare with `timingSafeEqual` |
| Policy | Minimum 10 characters; reject when equal to the email |
| Enumeration | Signup, signin, and reset: **same response body and similar timing** whether the email exists (signin of an unknown email still runs scrypt against a dummy hash) |
| Mail | `MailerPort` + **console adapter** only. Used for confirm and password reset. No SMTP/provider in this phase |
| Refresh | Opaque; store hash only; rotate every use; reuse revokes the session family |

## Legacy HMAC (phase-01 code)

`cloud/jord/src/auth/token.ts` mints `base64url(json).base64url(hmac)` via `signSessionToken`.

| Token | After S0021-B |
|-------|----------------|
| HMAC session token | **Stays valid.** Kind `operator`. Role is the signed `admin` \| `editor` \| `readonly`. Not a user JWT |
| Raw shared secret as Bearer | Kind and role follow `JORD_LEGACY_SECRET_ROLE` (see switch below) |

### Breaking change switch (`JORD_LEGACY_SECRET_ROLE`) — decided

| Phase inside this sprint | Default when unset | Effect |
|--------------------------|--------------------|--------|
| **Transition (land first)** | **`admin`** | Raw `JORD_SERVER_TOKEN` bearer keeps today's mapping: `JORD_DEFAULT_ROLE` (default `admin` in `cloud/jord/src/auth/config.ts`). Kind is still labeled for the principal model; role stays operator-compatible `admin` so curl / README / tests do not break on day one |
| **End of S0021-B (before the card closes)** | **`service`** | Flip the unset default to `service` / `service_role` (bypasses user policies). Set `JORD_LEGACY_SECRET_ROLE=admin` only as a temporary escape |

**Same-sprint doc and helper updates (required before flip):**

- Curl examples in `cloud/jord/README.md` and Studio help that show raw bearer as admin
- `cloud/jord/.env.example`, `apps/jord-studio/.env.example`
- `authHeaders("raw")` in `cloud/jord/src/app.test.ts` — after the flip, raw means `service` unless the test sets `JORD_LEGACY_SECRET_ROLE=admin`

Boot logs a **deprecation warning** whenever a raw bearer is accepted under either mode, so labs notice the kind change.

| Env value | Effect |
|-----------|--------|
| unset | Follow the sprint-phase default above (`admin` until flip, then `service`) |
| `admin` | Raw bearer → `JORD_DEFAULT_ROLE` (today's behavior) |
| `service` | Raw bearer → kind `service`, role `service_role` |

Remove the escape after S0021; do not carry `JORD_LEGACY_SECRET_ROLE=admin` into S0022 as the recommended lab default.

### Who sends the raw secret today (caller inventory)

Studio does **not** send the raw token. `apps/jord-studio/src/lib/auth/session.ts` HMAC-signs a role and the BFF forwards that bearer.

| Caller | What it does with `JORD_SERVER_TOKEN` |
|--------|----------------------------------------|
| `cloud/jord/src/auth/token.ts` | If `Authorization` bearer equals the secret, return `defaultRole` |
| `cloud/jord/src/auth/config.ts` | Loads the secret. `JORD_DEFAULT_ROLE` defaults to `admin` |
| `cloud/jord/src/auth/middleware.ts` | Passes `defaultRole` into verify |
| `cloud/jord/src/auth/token.test.ts` | Asserts raw secret → `defaultRole` |
| `cloud/jord/src/app.test.ts` | `authHeaders("raw")` sends the raw secret (call sites around records tests). Other `authHeaders(role)` calls send an HMAC token |
| `apps/jord-studio/src/lib/auth/session.ts` | Uses the secret as the **HMAC key**. Forwards `signSessionToken`, not the raw secret |
| `apps/jord-studio/src/lib/auth/token.ts` | Studio-side sign/verify (HMAC). Raw equality → `defaultRole` if ever used |
| `apps/jord-studio` BFF (`jord-proxy.ts`, `api/realtime/route.ts`) | Forwards HMAC bearer from session |
| `apps/jord-studio` UI copy (`login/page.tsx`, `studio-gate.tsx`, `help/page.tsx`) | Mentions the env var; does not send raw bearer from the browser |
| `cloud/jord/.env.example`, `apps/jord-studio/.env.example`, both READMEs | Document the raw token as a bearer with `JORD_DEFAULT_ROLE` |
| Bots / scripts | **None in this repo.** Artemis scratchpad is not built |

HMAC test: an existing `signSessionToken` still resolves to `operator` and is rejected as `user`.

**Mode tests (both required):**

1. `JORD_LEGACY_SECRET_ROLE=admin` (or unset during transition) → raw → `admin` / `JORD_DEFAULT_ROLE`
2. `JORD_LEGACY_SECRET_ROLE=service` (or unset after flip) → raw → `service` / `service_role`

## Realtime

SSE and WebSocket: when the access JWT `exp` passes, **close the stream or require re-auth** before the next event. Do not keep a socket open on a dead token.

## Routes

`POST /auth/signup` · `/auth/signin` · `/auth/refresh` · `/auth/logout` · `/auth/recover` · `/auth/reset` · `/auth/confirm` · `/auth/anon-key` · `GET /auth/me`

## R4. Doc ownership (this card)

This card's PR updates `Docs/tech_space/jord/auth/README.md`. Verify does not write that page.

## Definition of Done (`jord-s0021-b`)

- [ ] `Principal` is the only auth subject passed into route handlers
- [ ] Route table above is implemented for groups that exist today; future groups are listed as denied until their sprint
- [ ] HS256 pinned; `none` rejected; two kids verify; current kid signs
- [ ] Async scrypt + dummy-hash timing; enumeration tests for signup/signin/reset
- [ ] Refresh reuse revokes the family
- [ ] Console `MailerPort` sends confirm + reset bodies in tests (no network)
- [ ] HMAC operator token test green
- [ ] Transition default is `admin`; boot deprecation warning on raw bearer
- [ ] Mode test: `JORD_LEGACY_SECRET_ROLE=admin` → raw → `admin`
- [ ] Mode test: `JORD_LEGACY_SECRET_ROLE=service` → raw → `service`
- [ ] Before card close: default flipped to `service`; curl / README / `.env.example` / `authHeaders("raw")` updated in the same sprint
- [ ] Caller inventory above stays accurate or is updated if new callers appear
- [ ] SSE/WS drop or re-auth at JWT exp
- [ ] No secrets in logs / health
- [ ] `Docs/tech_space/jord/auth/README.md` updated in this PR
