---
title: "plan/ui-kit — Apolyx-S0011 sprint"
description: "Sprint Apolyx-S0011: remaining NextUI-inspired agent extras"
created: 2026-11-25
updated: 2026-11-25
tags:
  - plan
  - ui-kit
  - apolyx
  - sprint
  - Apolyx-S0011
  - readme
---

# plan / ui-kit — Apolyx-S0011

> Who: **apollo**. Feature: [[../../../feature_list/ui-kit/12-apolyx-s0011-agent-extras|apolyx-F0014]]. Prior: [[../Apolyx-S0010/README]].

**Sprint id:** `Apolyx-S0011`  
**Status:** done — 2026-11-25 · **Owner:** apollo

## Decisions

1. Presentational + callbacks only — no AI SDK / MCP transport in kit.
2. Semantic tokens; `useReducedMotion` from kit motion helper.
3. `autoPlay` + IntersectionObserver pause on docs demos where useful.
4. Clear S0010 `new` badges; mark these fifteen `new`.

## Scope

AgentQuestion, PlanReview, StagedAction, SecretRequest, McpServers, BrowserAgent, SqlQueryCard, SandboxPreview, BackgroundTasks, SubAgents, ScheduledTrigger, ErrorRetry, ArtifactPanel, CostTracker, ModelArena

## Proof

- `pnpm --filter @altr/apolyx build`
- `pnpm --filter @altr/apolyx typecheck`
- `pnpm --filter apolyx typecheck`