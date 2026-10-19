---
title: "Tia — security and data stewardship"
description: "Consent, minimization, retention, authorization, anti-spam, and no individual-driver broadcast"
created: 2026-10-19
updated: 2026-10-19
tags:
  - feature
  - tia
  - security
  - privacy
---

# Tia — security and data stewardship

> Index: [[README]]. Controls are **Proposed** and proportional to pilot scale — not a claim of legal compliance certification.

## Consent and purpose

- Clear opt-in for probe upload; separate from “use my GPS on-device for navigation.”
- Purpose limitation: traffic/ETA quality + operations; no silent resale.
- Iran-specific legal basis: **Unresolved** — counsel required before Phase 2 production collection.

## Minimization

| Collect | Avoid |
|---------|-------|
| Coarse-enough samples for matching | Continuous raw audio/video |
| Accuracy, speed, heading as needed | Unnecessary contacts, photos |
| Hashed/unlinkable subject handle where possible | Storing precise home/work labels in traffic tables |

## Identity separation

- `subjectId` / account id ≠ `traceId`.
- Traffic aggregates and public APIs expose **no** individual traces.
- Admin access to raw observations is role-gated and audited (**Proposed**).

## Retention and deletion

| Class | Pilot default (**Proposed** — tune) |
|-------|-------------------------------------|
| Raw observations | Short window (e.g. 7–30 days) then delete/aggregate |
| Aggregates | Longer; no user id |
| Trace archives in object storage | Lifecycle rules; deletion on account erase request |

User deletion request: delete or anonymize raw rows tied to subject; aggregates remain if irreversible.

## Authorization

| Resource | Rule |
|----------|------|
| Own trip / live location share | Only subject (or explicit share grant) |
| Traffic tiles / edge speeds | Public or app-authenticated aggregate only |
| Admin raw export | Break-glass role |

## Anti-abuse

| Threat | Control (**Proposed**) |
|--------|------------------------|
| Spam incident reports | Auth + rate limit + moderation queue |
| Fabricated traces | Mock flags, speed physics, device attestation later (**Deferred**) |
| Credential stuffing on APIs | Standard API keys / app attest — **Unresolved** auth stack |

## No accidental broadcast

- Realtime channels subscribe to **aggregates** and incidents, not per-driver positions, unless a distinct consented sharing product is specified (not pilot).

## Links

- Location quality mock handling: [[04-location-quality]] · Pipeline consent: [[05-traffic-pipeline]]
