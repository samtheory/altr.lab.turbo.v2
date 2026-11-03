---
title: "Jord — auth and roles"
description: "Principals (operator, service, user, anon), HMAC operator tokens, HS256 JWT, the route matrix, auth settings, user admin, JWT key rotation, email templates and MailerPort (console / Resend / SES)"
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
| `/admin/auth/users*` | yes | no | no | no | no | no |
| `/admin/auth/jwt*` | yes | no | no | no | no | no |
| `POST /admin/auth/email/send-test` | yes | no | no | no | no | no |
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
| Mail | `MailerPort` via `createMailerFromEnv` — `JORD_MAILER=console|resend|ses` ([[../../../plan/Jord/phase-03/done/S0073-mailer-port\|S0073]]). Bodies from project templates (S0072); logs only `to` + subject |
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
| `email_password_enabled` | `true` | `POST /auth/signup` + `/auth/signin` → **403** `provider_disabled` |
| `anonymous_enabled` | `true` | `POST /auth/anon-key` → **403** `provider_disabled` |
| `custom_claims` | `{}` | Merged into user access tokens on sign-in/refresh; reserved claims refused |

`redirect_to` is accepted by signup, recover, reset and confirm. Validation rejects non-http(s) schemes, protocol-relative `//host` values, embedded credentials and off-list hosts; wildcard patterns may not appear in the scheme. Redirect targets are validated; rendered mail uses templates (S0072) and the env-selected mailer (S0073). Magic-link auth shipped in [[../../../plan/Jord/phase-03/done/S0074-magic-link|S0074]] (see Magic link below).

| Piece | Path |
|-------|------|
| Migration | `elements/jord/migrations/{libsql,postgres}/0016_auth_settings.sql` |
| Schema mirror | `elements/jord/src/schema/auth-settings.ts` (defaults + bounds) |
| Loader / validation / allowlist | `cloud/jord/src/auth/settings.ts` |
| Admin routes | `cloud/jord/src/auth/settings-routes.ts` → mounted at `/admin/auth` |
| Enforcement | `cloud/jord/src/auth/routes.ts` · `identity.ts` · `password.ts` |
| Inventory | `/admin/auth/*` → `admin auth` surface in `route-inventory.ts` |
| Tests | `cloud/jord/src/auth/settings.test.ts` — defaults, persistence, validation, 403 gate, autoconfirm, policy, open redirect, 429, TTL, audit |

### User admin (S0070)

Operator-admin CRUD over end users. Studio's Auth console is the caller; responses never contain a password hash, token hash or raw token.

| Method | Path | Effect |
|--------|------|--------|
| GET | `/admin/auth/users` | All users, newest first (`AdminUser`: id, email, confirmed, disabledAt, banReason, metadata, lastSignInAt, timestamps) |
| GET | `/admin/auth/users/:id` | One user or **404** `user_not_found` |
| POST | `/admin/auth/users` | `mode: create` (password required, policy-checked) or `mode: invite` (random password, unconfirmed, confirm token + mail); 409 on duplicate email |
| PATCH | `/admin/auth/users/:id` | `user_metadata` / `app_metadata` (objects, ≤16 KB), `email_confirm`, `ban_reason` |
| POST | `/admin/auth/users/:id/ban` | `disabled` (default true) + `reason`; banning also revokes every refresh token |
| POST | `/admin/auth/users/:id/revoke` | Revokes all active refresh tokens, returns `{ revoked }` |
| DELETE | `/admin/auth/users/:id` | Deletes auth tokens, refresh tokens, then the user |

Every mutation appends a `jord_logs` row with `source = auth.users` (actor, user id, action, changed fields / reason / revoked count). Migration `0017_auth_user_admin.sql` adds `ban_reason` plus `user_metadata` / `app_metadata` / `last_sign_in_at` on `jord_users` for fresh and upgraded installs.

| Piece | Path |
|-------|------|
| Routes | `cloud/jord/src/auth/admin-routes.ts` → `/admin/auth/users*` |
| Data layer | `cloud/jord/src/auth/admin.ts` |
| Migration | `elements/jord/migrations/{libsql,postgres}/0017_auth_user_admin.sql` |
| Tests | `cloud/jord/src/auth/admin-users.test.ts` — create/invite, metadata, ban + revoke, delete, validation, 403 |

### JWT signing keys (S0071)

One optional per-project signing key, stored **sealed** in `jord_auth_settings` (AES-256-GCM via `JORD_MASTER_KEY`). Resolution order per request: stored key → `JORD_JWT_SECRET` → none (no JWT routes, 503). The key itself is never returned; the API exposes only `source`, a sha256 **fingerprint** (16 hex chars) and `rotated_at`.

| Method | Path | Effect |
|--------|------|--------|
| GET | `/admin/auth/jwt` | Key metadata + `session_ttl_seconds` + `custom_claims` |
| POST | `/admin/auth/jwt/rotate` | Generates a new 32-byte secret, seals it, stores it; **503** `jwt_key_unavailable` without a master key; audited `auth.jwt` |
| DELETE | `/admin/auth/jwt/key` | Removes the stored key; signs with `JORD_JWT_SECRET` again; audited `auth.jwt` |

**Invalidation policy:** rotation is immediate — every access token signed with the previous key fails verification (kid stays `current`, the secret changed). Refresh tokens are untouched, so clients recover by refreshing or signing in. `JORD_JWT_SECRET_PREVIOUS` only participates while no stored key exists. Expiry is `session_ttl_seconds` (also editable from the JWT section).

| Piece | Path |
|-------|------|
| Keyring | `cloud/jord/src/auth/keyring.ts` — sealed key → env, 5 s cache, invalidated on rotate/reset |
| Migration | `elements/jord/migrations/{libsql,postgres}/0018_auth_console.sql` |
| Middleware | `createAuthMiddleware(auth, keyring)` verifies with the resolved key list |
| Signing | `/auth/signin`, `/auth/refresh`, `/auth/anon-key` ask the keyring for the current secret |
| Tests | `cloud/jord/src/auth/console-sections.test.ts` — gates, claims, rotation + reset, non-disclosure, 503 |

### Email templates (S0072)

Four project-scoped templates (`confirm` · `magic_link` · `reset` · `invite`) plus sender identity live as JSON on `jord_auth_settings` (migration `0019_auth_email`). Variables: `{{email}}`, `{{token}}`, `{{link}}`, `{{expires_in}}`, `{{project}}`, `{{app_name}}`. HTML bodies HTML-escape every substitution; plain text does not. Defaults keep a `confirm:` / `reset:` / `magic:` token line so existing tooling still parses mail.

| Method | Path | Effect |
|--------|------|--------|
| PATCH | `/admin/auth/settings` | `email_templates` (partial) + `email_sender` (`from_name`, `from_address`, optional `reply_to`) |
| GET | `/admin/auth/settings` | Includes templates, sender and `email_provider` (`console` today) |
| POST | `/admin/auth/email/send-test` | `{ to, template }` → render sample vars → mailer; returns `message_id` + provider; admin-only, ~10/min; audited `auth.email` |

Signup confirm, admin invite and password recover all call `sendAuthEmail` so the Studio editor controls real outbound bodies. Without a real provider (`JORD_MAILER=console` or unset) the Studio Email section shows **Console mailer — no real delivery**.

| Piece | Path |
|-------|------|
| Render | `cloud/jord/src/auth/email-templates.ts` |
| Send helper | `cloud/jord/src/auth/email-send.ts` |
| Routes | `cloud/jord/src/auth/settings-routes.ts` (`/email/send-test`) |
| Migration | `elements/jord/migrations/{libsql,postgres}/0019_auth_email.sql` |
| Studio | `AuthEmailSection` · BFF `apps/jord-studio/src/app/api/admin/auth/email/send-test` |
| Tests | `email-templates.test.ts` · `studio-auth-email.test.ts` · principals recover path |

### Magic link (S0074)

| Route | Behaviour |
|-------|-----------|
| `POST /auth/magic-link` `{email, redirect_to?}` | Always `200 {ok:true}`. Token only for an existing, non-disabled user. Per-email 3 / 15 min (silent), per-IP uses the `recover` limit (429) |
| `GET`/`POST /auth/magic-link/verify` | `token` (+ optional `redirect_to`) → `access_token` + `refresh_token`. Single use via `UPDATE … RETURNING`, 15 min TTL, disabled user refused; `no-store` + `no-referrer` |

Tokens live in `jord_auth_tokens` (`purpose='magic'`, sha256, `created_ip` from migration 0020). `redirect_to` must pass the allowlist on both calls; a refused redirect does not consume the token. Prefer POST verify from a front end so mail scanners cannot burn the link. Open: `consumeOneTime` (confirm/reset) still uses select-then-update; `x-forwarded-for` is trusted without a proxy setting.

### Sessions (S0076)

| Route | Behaviour |
|-------|-----------|
| `GET /auth/sessions` | my live sessions: `id`, `device` ("Chrome on Windows"), `ip`, `created_at`, `last_seen_at`, `expires_at`, `current` |
| `DELETE /auth/sessions/:id` | revoke one of mine (404 for anyone else's) |
| `DELETE /auth/sessions[?others=true]` | revoke all mine, or all but the caller's |
| `GET`/`DELETE /admin/auth/users/:id/sessions` · `DELETE /admin/auth/sessions/:id` | operator admin |

A session id is the refresh-token family id; access tokens carry it as `sid` (a reserved claim). Every request through `createAuthMiddleware` checks the row: unknown, revoked, expired, wrong user, banned or deleted user is `401`, and a store error also denies. `last_seen_at` is written at most once a minute. Refresh keeps the `sid` and slides the 30-day expiry; revoked or expired sessions are never revived. Ban, delete and the legacy `/admin/users/:id/revoke` also close sessions. Job `sessions_gc` (hourly) removes sessions dead for 7 days. Tokens minted before S0076 have no `sid` and live until their access expiry. Open: SSE/WebSocket streams check only token expiry; no absolute session cap.

### OAuth — Google (S0075)

| Route | Behaviour |
|-------|-----------|
| `GET /auth/oauth/google[?redirect_to=]` | 403 if disabled, 503 without `site_url`; sets an HttpOnly `SameSite=Lax` `jord_oauth_state` cookie and 302s to Google with `state` + S256 PKCE. `redirect_to` must pass the allowlist |
| `GET /auth/oauth/google/callback` | cookie must equal `state`; state claimed once by `UPDATE … RETURNING` (10 min); code exchange (5 s timeout); id_token `iss`/`aud`/`exp`/`email_verified` checked. Any failure = `400 {error:"oauth_failed"}`. Success = JSON session, or 302 to `redirect_to` with tokens in the fragment |
| `GET`/`PUT /admin/auth/oauth/google` | operator admin. `{enabled, client_id, client_secret?}`; secret sealed with `JORD_MASTER_KEY`, never returned (`client_secret_configured` only). Enabling needs both |

`redirect_uri` is `site_url` + `/auth/oauth/google/callback` (register exactly this in the Google console). Identity match is by (provider, subject) in `jord_identities`; a verified email links to the existing user, or creates a confirmed one while sign-ups are open; an unverified email never links. Linking an unconfirmed account clears its password and revokes its refresh tokens. OAuth-created users carry `password_hash = 'oauth$none'`, which no password can match. Open: sealed secret does not survive a restart (in-memory port map); `x-forwarded-for` trusted for limits.

### MailerPort (S0073)

Process-wide mail adapter selected at boot. Keys stay in env / secret store — never the database or Studio UI.

| `JORD_MAILER` | Required env | Behavior |
|---------------|--------------|----------|
| `console` (default) | — | stdout log + in-memory `sent[]` for tests |
| `resend` | `JORD_RESEND_API_KEY`, `JORD_MAIL_FROM` (or `JORD_RESEND_FROM`) | HTTPS JSON to Resend |
| `ses` | `JORD_MAIL_FROM`, region (`JORD_SES_REGION` / `AWS_REGION`), AWS access key + secret | SigV4 Query `SendEmail` |

Both HTTP adapters use a **5 s** timeout and **one retry** on 5xx / 429 / network / timeout. Failures throw `MailerError` (`code`, `providerStatus`, `message`). Test-send returns those fields on **502**. Unknown `JORD_MAILER` or missing provider credentials refuse boot. When email is disabled for local work, leave `JORD_MAILER` unset (or `console`) — auth flows still mint tokens; only delivery is skipped beyond the console log.

| Piece | Path |
|-------|------|
| Port + adapters | `cloud/jord/src/auth/mailer.ts` |
| Boot wiring | `createJordApp` → `deps.mailer ?? createMailerFromEnv({ env })` |
| Env docs | `cloud/jord/.env.example` · `load-env.ts` |
| Tests | `cloud/jord/src/auth/mailer.test.ts` |

## How

| Module | Role |
|--------|------|
| `cloud/jord/src/auth/principal.ts` | `Principal` |
| `cloud/jord/src/auth/access.ts` | Route matrix and capability checks |
| `cloud/jord/src/auth/token.ts` | Raw secret, HMAC operator, JWT → principal |
| `cloud/jord/src/auth/jwt.ts` | HS256 sign / verify |
| `cloud/jord/src/auth/password.ts` | Async scrypt |
| `cloud/jord/src/auth/identity.ts` | Users, confirm/reset, refresh families |
| `cloud/jord/src/auth/mailer.ts` | `MailerPort`, console / Resend / SES, `createMailerFromEnv` |
| `cloud/jord/src/auth/email-templates.ts` | Template defaults, escape, parse |
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

Sessions console UI. Shipped: sessions API [[../../../plan/Jord/phase-03/done/S0076-sessions-claims|S0076]] · Users [[../../../plan/Jord/phase-03/done/S0070-auth-console-users|S0070]] · providers/URL/JWT/rate limits [[../../../plan/Jord/phase-03/done/S0071-auth-console-sections|S0071]] · email templates [[../../../plan/Jord/phase-03/done/S0072-email-templates|S0072]] · MailerPort [[../../../plan/Jord/phase-03/done/S0073-mailer-port|S0073]].
