---
title: "S0098 — per-project realtime data plane"
description: "App realtime + outbox use the registered project target; bus events are scoped by project slug"
created: 2026-11-25
updated: 2026-11-25
tags:
  - plan
  - jord
  - phase-03
  - task
  - S0098
---

# S0098 — per-project realtime data plane

> **Status:** in progress · **Phase:** [[README]] · Parent: [[../../../feature_list/Jord/todo/jord-F0021-projects-provisioning|jord-F0021]] · Depends on [[done/S0097-project-data-plane|S0097]] · After ship: [[../../../tech_space/jord/realtime/README]]

## Routing (who / how long / which model)

| | |
|--|--|
| **Parent feature** | `jord-F0021` |
| **Suggested agent** | mimir → **sindri** |
| **Companion skills** | `.agents/skills/graft/` · `.agents/skills/nodejs-backend-patterns/` |
| **Suggested model** | `claude-sonnet-5-5-high` |
| **Est. time** | 2–3 h |
| **Parallel?** | **No** |

## Goal

After S0097, Studio writes go to the project target, but `/p/:project/realtime` and the shared outbox still read the primary. Close that gap: each project's change feed and app realtime snapshot come from that project's database; bus subscribers only see their project's events.

## In scope

- Plane ALS carries `{ jord, slug }`
- Per-driver outbox (watermark + `jord_changes` on the active target)
- `JordChangeEvent.project` + bus filter
- App realtime: key lookup on primary; data/session/outbox on project target after handshake
- Drop/update the multi-project shared-plane warning when isolation holds
- Focused tests

## Out of scope

Postgres LISTEN bridges per remote project · presence/broadcast channels · origin allowlists

## Done when

- [ ] Write under project A does not appear on project B's app realtime feed
- [ ] Snapshot for `/p/A/realtime` lists A's tables only
- [ ] Key lookup still uses the control-plane primary
