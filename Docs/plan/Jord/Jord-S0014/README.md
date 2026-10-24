---
title: "Jord-S0014 — Studio S11 vectors / searchVectors"
description: "Done: in-process vector store + searchVectors on JordDriverPort; Studio Vectors panel"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0014
  - jord-studio
  - sprint
  - vectors
  - embeddings
---

# Jord-S0014 — Studio S11 vectors / searchVectors

> Who: **mimir**. **Status: done (2026-10-24).** Intent S11: [[../../../feature_list/Jord/03-jord-studio]]. Pillar: [[../../../feature_list/Jord/01-later]]. Prior: [[../Jord-S0013/README]]. As-built: [[../../../tech_space/jord/13-s0014-vectors]]. Remaining: [[../00-remaining-backlog]].

**Sprint id:** `Jord-S0014`  
**Opened:** 2026-10-24 · **Closed:** 2026-10-24 · **Owner:** mimir  
**Hats:** **sindri** · **saga** · **heimdall** · **apollo** · **docs_man**

## Why this next (yes — vectors are Jord)

Vectors are a **first-class Jord pillar**: `searchVectors` on `JordDriverPort`, Float32 store + lab cosine (sqlite-vec optional later), Postgres same API. Studio S11 is the control-plane surface. Artemis will *consume* Jord vectors later.

## Design lock (v1) — shipped

| Piece | Choice |
|-------|--------|
| Metadata + vectors | Table `jord_embeddings` (id, namespace, ref_id?, dims, embedding BLOB/BYTEA Float32 LE, metadata?, timestamps) |
| Embedding wire format | JSON number array in HTTP |
| Search | `searchVectors` → ranked hits; lab = in-process cosine |
| Embed model | Caller-supplied (no keys inside Jord) |
| Writes | Upsert/delete via write queue |
| Browser | Never opens DB; Studio via BFF |

## Phases

| # | Card | Hat | Status |
|---|------|-----|--------|
| 1 | [[01-contract]] | mimir / saga | **done** |
| 2 | [[02-engine-vectors]] | saga / sindri | **done** |
| 3 | [[03-server-routes]] | sindri / heimdall | **done** |
| 4 | [[04-studio-vectors]] | apollo | **done** |
| 5 | [[05-role-gates]] | heimdall / apollo | **done** |
| 6 | [[06-verify]] | mimir → docs_man | **done** |

## Definition of done

- [x] Port exposes upsert + search (+ delete) for embeddings on libSQL and Postgres
- [x] Server routes round-trip; bad dims / empty vector → 400; dims mismatch → 409
- [x] Studio **Vectors** panel: list by namespace, upsert sample, run search, see ranked hits
- [x] Roles: read/search = readonly+; upsert/delete = editor+
- [x] Browser never opens `data/jord.db`
- [x] Apolyx-first; tests green; as-built `Docs/tech_space/jord/13-s0014-vectors.md`
- [x] Vault refresh; sprint closed

## Explicitly out of this sprint

- Hosted embedding API / OpenAI keys inside Jord
- `pgvector` / sqlite-vec as hard dependencies
- Full CDC of embedding rows on realtime bus
- Hosted `libsql://`, Redis, bot process
- Artemis trading / agent retrieval product screens
- DROP TABLE / native Postgres RLS compile (see [[../00-remaining-backlog]])

## Links

- Track: [[../README]] · Backlog: [[../00-remaining-backlog]]
- Intent: [[../../../feature_list/Jord/03-jord-studio]] · Architecture: [[../../../feature_list/Jord/02-architecture]]
- Review: [[../../../report/Jord-implemented-review]]
