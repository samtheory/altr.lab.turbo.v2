---
title: "plan/ui-kit — Apolyx-S0010 sprint"
description: "Sprint Apolyx-S0010: HITL, voice, memory + marketing blocks"
created: 2026-11-25
updated: 2026-11-25
tags:
  - plan
  - ui-kit
  - apolyx
  - sprint
  - Apolyx-S0010
  - readme
---

# plan / ui-kit — Apolyx-S0010

> Who: **apollo**. Feature: [[../../../feature_list/ui-kit/11-apolyx-s0010-hitl-blocks|apolyx-F0013]]. Prior: [[../Apolyx-S0009/README]].

**Sprint id:** `Apolyx-S0010`  
**Status:** done — 2026-11-25 · **Owner:** apollo

## Decisions

1. Presentational + callbacks only — no AI SDK / OAuth SDK in kit.
2. Blocks live in `elements/ui-kit/src/blocks/` (installable compositions).
3. Semantic tokens; reduced-motion freezes loops / shows end state.
4. `autoPlay` demos for docs; clear S0009 `new`, mark S0010 `new`.

## Scope

**HITL:** ToolApproval, GuardrailCheck, OAuthConsent, AgentTimeline, AgentHandoff, VoiceAgent, VoiceOrb, AgentMemory, CheckpointRewind  

**Blocks:** HeroPill, HeroGrid, HeroWaitlist, HeroChat, CreativeHomeHero, AppShelf, UsageCard, PricingTiers, SignInBlock, TeamBlock, QuoteBlock, LeadsTable, DashboardHome, DesignResults, LaunchPerks, TheShift, MoodboardGenerator
