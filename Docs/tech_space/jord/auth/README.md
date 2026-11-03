---
title: "Jord — auth and roles"
description: "Principals (operator, service, user, anon), HMAC operator tokens, HS256 JWT, the route matrix, and the S0069 auth settings document"
created: 2026-10-24
updated: 2026-11-03
tags:
  - tech-space
  - jord
  - auth
  - principal
---

# Jord — auth and roles

> Who: anyone adding a route. Policies sit on top of this: [[../policies/README]]. Studio cookie: [[../studio/README]].

## Why

One process serves Studio operators and, from S0021-B, end-user principals. Operator tokens administer Jord. User and anon tokens are the app's principals. They are not interchangeable. `GET /health`, `/health/live`, and `/health/ready` stay public and do not echo secrets.

## What

Every authenticated handler reads one subject:

```ts
type Principal = {
  kind: "service" | "user" | "anon" | "operator"
  uid?: string
  role: string
  claims: Record<string, unknown>
}
```

| Kind | How it is presented | Role |
|------|---------------------|------|
| `operator` | HMAC session `base64url(json).base64url(hmac)` | `admin` / `editor` / `readonly` |
| `service` | Raw `JORD_SERVER_TOKEN` when legacy mode is `service` | `service_role` (data-plane bypass) |
| `user` | HS256 access JWT (`sub` = uid) | `user` |
| `anon` | Long-lived HS256 JWT from `POST /auth/anon-key` | `anon` (no uid) |

Unset `JORD_LEGACY_SECRET_ROLE` is **`service`**. Set it to `admin` only as a temporary escape: the raw secret then maps to `JORD_DEFAULT_ROLE` (default `admin`) and kind `operator`. Accepting a raw bearer logs one deprecation warning per process. The warning does not include the secret.

Studio does not send the raw secret. It HMAC-signs a role and the BFF forwards that bearer.

### Route matrix

`user` and `anon` are default-deny on data routes until a policy allows the table. `/api/v1` is mounted. Policies still decide the row.

| Route group | operator `admin` | operator `editor` | operator `readonly` | `service` | `user` | `anon` |
|-------------|------------------|-------------------|---------------------|-----------|--------|--------|
| `GET /health`, `/health/live`, `/health/ready` | public (no auth) | public | public | public | public | public |
| `POST /auth/signup\|signin\|refresh\|recover\|reset\|confirm` | public, rate-limited | public | public | public | public | public |
| `POST /auth/logout`, `GET /auth/me` | yes | yes | yes | yes | yes | me = anon claims |
| `POST /auth/anon-key` | yes | no | no | no | no | no |
| `/records`, schema **row** DML | yes | write | read | yes (bypass) | no until Part C | no until Part C |
| Schema **DDL** | yes | no | no | no | no | no |
| Generated API, vectors, blobs | yes | write / read | read | yes (bypass) | no until Part C | no until Part C |
| `/realtime`, `/realtime/ws` | yes | yes | yes | yes | yes until exp | yes until exp |
| Custom `/x/:slug` | yes | yes | no | yes | as caller, no escalate | as caller, no escalate |
| Jobs, policies, triggers | yes | no | inspect | no | no | no |
| `GET/PATCH /admin/auth/settings` | yes | no | no | no | no | no |
| `/api/v1` | yes (policies) | write / read | read | yes (bypass) | policies | policies |

| HTTP | Meaning |
|------|---------|
| 401 | Missing or invalid bearer |
| 403 | Valid principal, route or role refused |
| 429 | Auth route rate limit (30 / minute / client) |

### JWT and passwords

| Rule | Choice |
|------|--------|
| Signing secret | `JORD_JWT_SECRET` (sign + verify, kid `current`). `JORD_JWT_SECRET_PREVIOUS` verifies only (kid `previous`) |
| Alg | HS256. `none` and every other alg are rejected |
| Claims | `iss`, `aud`, `sub`, `role`, `iat`, `exp`. Default iss/aud `jord` |
| Access TTL | 15 minutes. Clock skew 60s |
| Anon key | Not stored. `role=anon`, about 10 years |
| Passwords | Async scrypt. Hash string stores N, r, p, and maxmem. Compare with `timingSafeEqual`. Minimum 10 characters; must not equal the email |
| Enumeration | Signup, signin, and recover return the same body whether the email exists. Unknown sign-in still runs scrypt against a dummy hash |
| Mail | `MailerPort`. The console adapter records confirm and reset bodies and logs only `to` + subject |
| Refresh | Opaque, SHA-256 hash only, rotate every use. Reuse revokes the family |

SSE writes `event: expired` / `token_expired` and ends when `exp` passes. WebSocket closes with code **4401**.

Accounts live in migration `0002_principals`: `jord_users`, `jord_auth_tokens`, `jord_refresh_tokens`.

### Auth settings store (S0069)

One row per project database in `jord_auth_settings` (`id = default`). A **missing row means today's behavior** — nothing changes on upgrade. `GET/PATCH /admin/auth/settings` is operator-admin only; `PATCH` validates strictly (unknown keys rejected) and writes a `jord_logs` row with `source = auth.settings` (actor + changed keys). Enforcement reads the row inside `/auth/*`, so a toggle actually changes behavior.

| Setting | Default | Enforced at |
|---------|---------|-------------|
| `signups_enabled` | `true` | `POST /auth/signup` → **403** `signups_disabled` |
| `autoconfirm` | `false` | Signup inserts `email_confirmed=1`, skips the confirm token + mail |
| `password_min_length` | `10` (6–128) | Signup + reset; unchanged rule: password must not equal the email |
| `site_url` | `null` | Same-origin redirects allowed |
| `redirect_allowlist` | `[]` | Absolute http(s) patterns — `*` one path segment, `**` anything. Fail closed: with no config every `redirect_to` is **400** `redirect_not_allowed` |
| `rate_limits` | `30`/min each | `signup`, `signin`, `refresh`, `recover`, `reset`, `confirm` on the S0036 `RateLimitStore` (Postgres shared / memory); limiter outage allows |
| `session_ttl_seconds` | `900` (60–86 400) | Access-token `exp` and `expires_in` on signin/refresh |

`redirect_to` is accepted by signup, recover, reset and confirm. Validation rejects non-http(s) schemes, protocol-relative `//host` values, embedded credentials and off-list hosts; wildcard patterns may not appear in the scheme. Redirect targets are only validated — email links are still console `confirm:` / `reset:` bodies until [[../../../plan/Jord/phase-03/S0073-mailer-port|S0073]]–[[../../../plan/Jord/phase-03/S0074-magic-link|S0074]].

| Piece | Path |
|-------|------|
| Migration | `elements/jord/migrations/{libsql,postgres}/0016_auth_settings.sql` |
| Schema mirror | `elements/jord/src/schema/auth-settings.ts` (defaults + bounds) |
| Loader / validation / allowlist | `cloud/jord/src/auth/settings.ts` |
| Admin routes | `cloud/jord/src/auth/settings-routes.ts` → mounted at `/admin/auth` |
| Enforcement | `cloud/jord/src/auth/routes.ts` · `identity.ts` · `password.ts` |
| Inventory | `/admin/auth/*` → `admin auth` surface in `route-inventory.ts` |
| Tests | `cloud/jord/src/auth/settings.test.ts` — defaults, persistence, validation, 403 gate, autoconfirm, policy, open redirect, 429, TTL, audit |

## How

| Module | Role |
|--------|------|
| `cloud/jord/src/auth/principal.ts` | `Principal` |
| `cloud/jord/src/auth/access.ts` | Route matrix and capability checks |
| `cloud/jord/src/auth/token.ts` | Raw secret, HMAC operator, JWT → principal |
| `cloud/jord/src/auth/jwt.ts` | HS256 sign / verify |
| `cloud/jord/src/auth/password.ts` | Async scrypt |
| `cloud/jord/src/auth/identity.ts` | Users, confirm/reset, refresh families |
| `cloud/jord/src/auth/mailer.ts` | `ConsoleMailer` |
| `cloud/jord/src/auth/routes.ts` | `/auth/*` |
| `cloud/jord/src/auth/middleware.ts` | Sets `principal` on the Hono context |
| `elements/jord/migrations/{libsql,postgres}/0002_principals.sql` | Account tables |

`JORD_SERVER_TOKEN` in `cloud/jord/.env.example` and `apps/jord-studio/.env.example` must still match. Studio keeps using it as the HMAC key.

## Example

```bash
curl -s -X POST http://127.0.0.1:8787/auth/signup \
  -H "content-type: application/json" \
  -d "{\"email\":\"ada@lab.test\",\"password\":\"correct-horse\"}"
```

The console mailer prints the confirm subject. After `POST /auth/confirm`, `POST /auth/signin` returns `access_token` and `refresh_token`. `GET /auth/me` with that access token returns `kind: user`. The same token `GET /records` returns **403** until Part C.

A raw `Authorization: Bearer $JORD_SERVER_TOKEN` is `service` / `service_role` unless `JORD_LEGACY_SECRET_ROLE=admin`.

## Not in Jord yet

OAuth, SMTP/real mail delivery, magic link, and the Studio Auth console UI ([[../../../plan/Jord/phase-03/S0070-auth-console-users|S0070]]–[[../../../plan/Jord/phase-03/S0072-email-templates|S0072]]). Provider credentials and JWT key management are [[../../../plan/Jord/phase-03/S0071-auth-console-sections|S0071]].
