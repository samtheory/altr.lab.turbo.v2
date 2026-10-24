---
title: "Phase 5 — realtime role gates"
description: "Who may open the SSE stream; Studio Live control visibility"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0011
  - heimdall
  - roles
---

# Phase 5 — realtime role gates

> Who: **heimdall** · **apollo** (Studio affordances). Depends on [[03-server-sse]] + [[04-studio-live]].

Sprint index: [[README]] · Auth: [[../../../tech_space/jord/04-s0005-auth]]

## Status

**done** (2026-10-24)

## Goal

| Role | Subscribe (SSE) | Mutate |
|------|-----------------|--------|
| `admin` | yes | yes (existing) |
| `editor` | yes | yes (existing) |
| `readonly` | yes | no (existing) |

Policies that deny `select` on `records` should also deny the stream (or filter to empty — pick one in phase 1 and stick to it; prefer **deny stream** for simplicity).

## Done when

- [ ] Server tests cover allow/deny for roles
- [ ] Studio hides or disables Live when the session cannot subscribe
- [ ] No privilege escalation via EventSource URL alone
