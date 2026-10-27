---
title: "feature_list — product intent"
description: "Raw feature instructions awaiting implementation. Each app uses stable {app}-F#### ids."
created: 2026-09-19
updated: 2026-10-27
tags:
  - feature
  - readme
---

# feature_list

Raw feature briefs for altr.lab. Intent lives here; as-built lives in `tech_space/`.

Map: [[../brain/00-Docs-Brain]] · Template: [[../agents/templates/structured-note]] · Roadmap: [[../plan/00-roadmap-apolyx-jord-artemis]]

Promote from `idea/` → write a dated note here → plan in `plan/` → implement → `tech_space`.

App-scoped tracks live under `feature_list/<app>/`. Sprint/task cards go in `plan/<app>/`.

## Feature ids

Every durable feature note gets a **stable id**: `{app}-F####` (zero-padded).

| App folder | Prefix | Registry |
|------------|--------|----------|
| `Jord/` | `jord-F####` | [[Jord/INDEX]] |
| `ui-kit/` (Apolyx) | `apolyx-F####` | [[ui-kit/INDEX]] |
| `tia/` | `tia-F####` | [[tia/INDEX]] |

Rules:

1. Put `feature_id: jord-F0013` in YAML frontmatter (and in the H1 when practical).
2. Prefer filenames `jord-F0013-slug.md` for new notes.
3. **Never reuse** a retired id; bump “next free” on the app INDEX.
4. Plan tasks cite the parent feature id (e.g. S0034 → `jord-F0013`).
5. Wikilinks may use the file path; prose and plan tables should show the **id**.

## Tracks

| Track | Index | Intent |
|-------|-------|--------|
| **Elements deps** | — | [[00-elements-dependency-rules]] — `@altr/base` leaf |
| **Apolyx UI kit** | [[ui-kit/INDEX]] · [[ui-kit/README]] | `apolyx-F####` · S0001–**S0005** closed |
| **Jord** | [[Jord/INDEX]] · [[Jord/README]] | `jord-F0001`… · plans [[../plan/Jord/README]] |
| **Tia** | [[tia/INDEX]] · [[tia/README]] | `tia-F####` · **no code** yet |
| **Artemis** | — | Still [[../idea/artemis/README]] only |

## Legacy / shipped features

- [[01-hub-ui-kit-base]] — hub landing shipped 2026-09-20, app removed 2026-10-18; ui-kit and base remain
- [[02-ui-kit-storybook]] — Storybook for ui-kit (shipped)
