---
title: "API client — open-source Postman-class workbench"
description: "Captured idea: an open-source API client in the Postman class, using Zapi as the product reference, with extra features still to name"
created: 2026-10-19
updated: 2026-10-19
tags:
  - idea
  - api-client
  - postman
  - readme
---

# API client

> Open this to grow the API workbench. Catalog: [[../2026-10-18-product-catalog]]. Map: [[../../brain/00-Docs-Brain]].

**Working title:** API client. Name is not locked.

**Vault stage:** captured (phase 0). No app folder yet. Not in `feature_list/`.

**Reference:** [Zapi](https://z-api.ir/) — a Persian API terminal aimed at teams on internal Iranian infrastructure. This track is an open-source product in that class, meant to be a better Postman, plus extra features you still need to name.

---

## Problem

Postman is the default API client and it is closed, heavy, and a poor fit when a team wants the data on its own machines. [Zapi](https://z-api.ir/) already aims at that gap (familiar request UI, shared environments, self-host, realtime). There is still no open-source altr.lab track for the same job.

## Concept

An open-source API client: send a request, read the response, keep environments and history, then grow into team sync and self-host. The first bar is “I can replace a Postman tab.” The second bar is whatever extra features you name in the sharpening note. Zapi is the reference for tone and scope, not a spec to copy.

## Who it is for

You, then a small team that tests HTTP APIs daily and wants the collection on infrastructure you control.

## What the reference already shows

Public positioning on [Zapi](https://z-api.ir/) (2026-10-19), kept here so the sharpening note can say what we match and what we skip:

| Area | What Zapi advertises |
|------|----------------------|
| Request runner | Method, URL, params, body, headers, Send, response. Variables such as `{{USERS_URL}}` |
| Familiar speed | Postman-like flow, claimed faster, no workflow change for the team |
| Place | Built for Iranian networks and in-house infrastructure |
| Team reuse | Shared variables, environments, and settings, synced across projects |
| Ownership | Self-hosted node, internal database (they show PostgreSQL), data stays on your server |
| Later on their site | MCP “coming soon”; live monitoring; vulnerability checks; automated scripts; debug console; history |
| Realtime | WebSockets, SSE, and data streams |
| Scripts | Small test snippets against a response |
| Performance | Latency and resource readouts |

Pricing on that site (trial, Node, Cluster, Grid, Galaxy) is their business model. This track starts open source. Monetization is an open question.

## Extra features

You asked for a better Postman **with extra features you want**. Those features are not written down yet. Do not treat the Zapi list above as the altr.lab backlog.

## Product phases

| Phase | Name | User-visible outcome | Depends on |
|-------|------|----------------------|------------|
| 1 | One request | Type method + URL, send, see status, time, and body | Nothing in-repo yet |
| 2 | Environments | Named variables, swapped per environment, interpolated in URL and headers | Phase 1 |
| 3 | Collections and history | Saved requests and a local history you can rerun | Phase 1 |
| 4 | Extra features | Whatever the sharpening note names, and only those | Phases 1–3 if they need a saved request |

Self-host, team sync, scripts, WebSocket/SSE, and security scanning stay out of phase 1.

## Monetization hypothesis

Open source first. A later paid slice could be hosted sync or an org install, in the same spirit as Jord’s open-core note. Nothing to charge for until phase 1 is a daily driver.

## Stack synergy

Apolyx for the workbench UI. Jord only if saved collections need the shared database; a local file is enough for phase 1. No new database family until the sharpening note says otherwise.

## Open questions

1. Product name?
2. Which extra features are in scope for phase 4 (name them; do not inherit Zapi’s whole marketing list)?
3. Desktop, web, or both for phase 1?
4. Where do collections live before any server exists (local file only)?
5. Is “better than Postman” speed, offline use, self-host, or something else?

## When this track is chosen

Add a sharpening note with: the name, the one user, the phase-1 screen (one request, one response), where the app lives, and the extra-feature list. Non-goals for that note: MCP, vulnerability scanning, a public cloud, and cloning Zapi’s marketing site.
