---
title: "jord-F0030 — auth console"
feature_id: jord-F0030
description: "Supabase-style Auth menu: users, sessions, providers, redirect URLs, JWT keys, email templates, rate limits — per project"
created: 2026-10-28
updated: 2026-11-03
tags:
  - feature
  - jord
  - todo
  - jord-F0030
  - studio
  - auth
---

# jord-F0030 — auth console

> **Status:** in progress (S0069 done) · **Id:** `jord-F0030` · Index: [[../INDEX]] · Today: `/auth/users` only · [[../done/jord-F0005-auth|jord-F0005]] · [[jord-F0016-auth-v2|jord-F0016]]

## What

A top-level **Auth** menu in Studio, shaped like Supabase’s Auth dashboard, scoped to the active project.

| Section | Content |
|---------|---------|
| **Users** | List + search, create/invite, view and edit `user_metadata` / `app_metadata`, ban/disable, delete, “revoke all sessions” |
| **Sessions** | Active sessions with device/IP/last-seen, revoke one or all; “run as user” tester links to [[jord-F0016-auth-v2|F0016]] |
| **Providers** | Email + password, magic link, anonymous sign-ins, OAuth (Google, GitHub, Apple, …): client id/secret, scopes, enabled toggle, callback URL |
| **URL configuration** | Site URL, redirect allowlist with wildcard rules, per-environment note |
| **JWT** | Signing key + rotation, access-token expiry, custom claims editor with a decoded-token preview |
| **Email** | Templates for confirm / magic link / reset / invite (subject + body variables), sender identity, **test send** |
| **Rate limits** | Per-endpoint limits (sign-up, sign-in, magic link, email send) with sane defaults |
| **Settings** | Sign-ups enabled, autoconfirm, password policy, captcha toggle later |

Provider secrets (OAuth client secret, SMTP/Resend key) are **write-only** and never returned by list/detail endpoints.

### Gate

Console capability must match what the server actually supports. OAuth, magic link, session listing, custom claims, and real email delivery are **[[jord-F0016-auth-v2|jord-F0016]]** work; until then those sections render a disabled “requires auth v2” state with the dependency linked — no fake toggles that persist but do nothing.

## Acceptance

1. Disabling a provider or sign-ups makes the matching server call fail with a clear error, not just hide a form.
2. A redirect that is not in the allowlist is rejected by the server (open-redirect test).
3. OAuth client secret and mailer key never appear in any response or client bundle; rotation invalidates the old value.
4. Rotating the JWT key invalidates previously issued tokens according to the documented policy, and the preview shows the new claims.
5. Banning a user or revoking sessions ends their access on the next request (no stale session window beyond the documented grace).
6. All settings persist per project and are visible to an admin after reload.

## Overlap

| Id | Change |
|----|--------|
| [[../done/jord-F0005-auth\|jord-F0005]] | `/auth/users` becomes the Users section; existing disable/revoke semantics stay |
| [[jord-F0016-auth-v2\|jord-F0016]] | Owns the server capabilities this console configures (magic link, OAuth, sessions, claims, mailer) |
| [[../done/jord-F0008-policies\|jord-F0008]] | Row policies stay in Database → Policies; Auth links to them, does not duplicate |
| [[jord-F0021-projects-provisioning\|jord-F0021]] | Per-project keys and secret-at-rest store |
| [[jord-F0023-studio-shell-v2\|jord-F0023]] | Menu + contextual sidebar hosts Users/Sessions lists and provider sections |
| [[jord-F0019-security-pass\|jord-F0019]] | Enumeration, CSRF/state, and open-redirect checks are part of the pass |

## Open questions

- Which OAuth providers are first-party vs generic OIDC config.
- Whether email templates live per project or inherit a global default.
- Multi-tenant “organization” auth is **not** implied by this menu; ask before adding.

## Out of scope

SAML/SCIM · organization/team management UI · MFA enrollment screens (until auth v2 says otherwise) · migrating an existing external auth user base.

## Plan tasks

| Task | Est. | Status |
|------|------|--------|
| [[../../../plan/Jord/phase-03/done/S0069-auth-settings-store\|S0069]] — auth settings store + API | 2.5–3 h | **done** 2026-11-03 |
| [[../../../plan/Jord/phase-03/S0070-auth-console-users\|S0070]] — console shell + Users | 2.5–3 h | todo |
| [[../../../plan/Jord/phase-03/S0071-auth-console-sections\|S0071]] — providers/URL/JWT/rates | 3 h | todo |
| [[../../../plan/Jord/phase-03/S0072-email-templates\|S0072]] — email templates + test send | 2–3 h | todo |

Queue: [[../../../plan/Jord/phase-03/README]].
