---
title: "S0070 — Auth console shell + Users section"
description: "Top-level Auth menu per project with the Supabase-shaped section list; Users gains create/invite, metadata edit, ban and revoke-all"
created: 2026-10-28
updated: 2026-10-28
tags:
  - plan
  - jord
  - phase-03
  - task
  - S0070
---

# S0070 — Auth console shell + Users section

> **Status:** todo · **Depends on** [[S0069-auth-settings-store|S0069]] · **Phase:** [[README]] · Parent: [[../../../feature_list/Jord/todo/jord-F0030-auth-console|jord-F0030]] · After ship: [[../../../tech_space/jord/studio/README]]

## Routing (who / how long / which model)

| | |
|--|--|
| **Suggested agent** | mimir → **apollo** (Studio) with **heimdall** reviewing mutations |
| **Companion skills** | `.agents/skills/apollo/` · `.agents/skills/security-and-hardening/` · `.agents/skills/vercel-react-best-practices/` |
| **Suggested model** | `claude-sonnet-5-5-high` |
| **Est. time** | **2.5–3 h** |
| **Parallel?** | **No** |

## Goal

An **Auth** menu in Studio with sections Users · Sessions · Providers · URL configuration · JWT · Email · Rate limits · Settings, and a fully working **Users** section: list + search, create/invite, view and edit `user_metadata` / `app_metadata`, ban/disable, delete, revoke all sessions.

## Why now

Today only `/auth/users` exists with a basic panel; the requested console needs the navigation shell and one complete section to set the pattern.

## Context (read before coding)

| Kind | Where |
|------|-------|
| Intent | [[../../../feature_list/Jord/todo/jord-F0030-auth-console|jord-F0030]] (Users) |
| Depends on | [[S0069-auth-settings-store|S0069]] · [[done/S0047-contextual-sidebar|S0047]] (user list lives there) |
| Code today | `components/users-admin-panel.tsx` · `app/p/[project]/auth/` · `cloud/jord/src/auth/{admin,routes,identity}.ts` |
| Gate | Sections the server cannot back yet render **disabled with a reason** and a link to the owning card — never a fake toggle |

**Do not break:** existing disable/revoke semantics; no password hash or token in any response; every mutation audited.

## In scope

- Auth section nav (sub-nav or sidebar group) with the eight sections; each route exists and either works or shows the gated state with the dependency named.
- Users: list with search + pagination, row detail (id, email, created, last sign-in, metadata JSON), create/invite form, metadata editor with JSON validation, ban/disable with reason, delete with confirm, revoke all sessions.
- Sessions section shows a gated link until [[S0076-sessions-claims|S0076]].
- Empty/loading/error states; role-aware disabled actions for non-admins.

## Out of scope

Providers/URL/JWT/rate-limit forms ([[S0071-auth-console-sections|S0071]]) · email templates ([[S0072-email-templates|S0072]]) · org/team management.

## Diagram

```mermaid
flowchart LR
  M[Auth menu] --> U[Users: list/create/ban/delete]
  M --> S[Sessions → gated']
  M --> P[Providers → S0071]
  M --> J[JWT → S0071]
  M --> E[Email → S0072]
  U --> API[/auth/users + /admin/auth/users/]
```

## Steps (do in order)

1. Load apollo; read the existing users panel and auth routes.
2. Build the Auth section nav + route stubs with explicit gated states.
3. Complete Users CRUD + metadata editing + ban/delete/revoke.
4. Add audits for each mutation; role-aware UI.
5. Typecheck + build; run the flows against a local instance; paste proof.
6. **docs_man**: studio tech_space auth section map; tick card.

## Done when

- [ ] All eight sections are reachable; unshipped ones state their dependency
- [ ] User create/invite, metadata edit, ban, delete, revoke-all work
- [ ] No sensitive field in responses or the UI
- [ ] Non-admin sees disabled actions
- [ ] Proof pasted

## Proof

| Date | Command | Result |
|------|---------|--------|
| | `pnpm --filter @altr/jord-studio typecheck` | |
| | `pnpm --filter @altr/jord-studio build` | |

## After ship

| Update | Path |
|--------|------|
| tech_space | `Docs/tech_space/jord/studio/README.md` |
| Queue | [[README]] |
