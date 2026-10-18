---
title: "Co-Op Sphere — idea track"
description: "R&D folder for proof-of-effort matchmaking: habits, projects, and a minimal direct chat"
created: 2026-10-18
updated: 2026-10-18
tags:
  - idea
  - co-op-sphere
  - social
  - readme
---

# Co-Op Sphere

> Open this to grow matchmaking by demonstrated habits and values. Catalog: [[../2026-10-18-product-catalog]]. Map: [[../../brain/00-Docs-Brain]].

**Life pillar:** partner, network, gym partners, game partners.

**Vault stage:** captured (phase 0). No app folder yet.

---

## Problem

Dating apps reward swipes. Professional networks reward posture. Finding a cofounder, a serious training partner, a strategy-game friend, or a partner with a growth-minded life is guesswork because the profile is a performance, not a record.

## Concept

Match on **proof of effort and values**: sleep and wake pattern, income goals, games you actually play (strategy, RPG), and how you train. The surface is a direct, minimal chat. There is no engagement feed.

## Who it is for

You and a small circle first (gym, games, projects). A public directory comes after the profile and the intro request are honest.

## Core capabilities

- **Vibe and habit sync** — match on recorded habits (sleep window, income target, games, training method), not photos-first swipes.
- **Project and bounty collaboration** — a board for shared builds, teammates, sponsors, and commercial partners.
- **Zero algorithmic trap** — direct chat, no ranked feed.

This track is not the encrypted offline messenger. That draft stays separate: [[../draft/2026-10-17-p2p-social-messenger]]. Co-Op Sphere assumes an account and a server. The messenger assumes no central message store. Merge them only in a later note if you decide one product must do both.

---

## Product phases

| Phase | Name | User-visible outcome | Depends on | Intended packages |
|-------|------|----------------------|------------|-------------------|
| 1 | Habit profile | You publish sleep window, income goal, games, training method. One page, editable | Auth | Next.js app, Apolyx forms |
| 2 | Intro request | You see a short list of people who overlap on fields you choose, and send one intro. No swipe stack | Phase 1 | same app, Turso |
| 3 | Minimal chat | A thread exists only after an intro is accepted. Message list, no feed | Phase 2 | Hono or Next route |
| 4 | Project board | A project card with roles wanted; people attach from an accepted circle | Phase 2 | Turso |
| 5 | Trust and fees | Verification badge and, later, escrow on a bounty | Phases 3–4 and a payments decision | deferred |

## Monetization hypothesis

Verification badges and escrow fees on deals. Both sit in phase 5. Earlier phases are the product you would use with people you already want to meet.

## Stack synergy

Next.js and auth. PocketBase is a candidate for the first auth and profile store if `@altr/base` auth is still a stub; Turso if you want one database story with the other tracks. Decide in the sharpening note.

## Open questions

1. What counts as proof in phase 1: self-reported fields, or a link to HyperFit / a git repo / a game tag?
2. Circle size for the first build: invite-only, or open sign-up?
3. Chat transport: store messages in Turso, or point at the P2P draft and keep this app to profiles only?
4. Which relationship is the first matcher: training partner, cofounder, or romantic partner? One, so the profile fields stay small.

## When this track is chosen

Add a sharpening note that picks one relationship type, lists the profile fields, states whether messages are stored, and names non-goals (no swipe deck, no feed, no escrow). That is the entrance to `feature_list/co-op-sphere/`.
