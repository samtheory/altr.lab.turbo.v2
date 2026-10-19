---
title: "Search — open-source engine for Iran"
description: "Captured idea: an open-source web search app in the DuckDuckGo and Google class, aimed at people in Iran"
created: 2026-10-19
updated: 2026-10-19
tags:
  - idea
  - search
  - iran
  - readme
---

# Search

> Open this to grow the search product. Catalog: [[../2026-10-18-product-catalog]]. Map: [[../../brain/00-Docs-Brain]].

**Working title:** Search. Name is not locked.

**Vault stage:** captured (phase 0). No app folder, crawler, or index yet. Not in `feature_list/`.

**Class references:** [DuckDuckGo](https://duckduckgo.com/) for a privacy-first search app people can run and trust, and Google for ordinary web search (a box, a ranked list, Persian and the open web). This track is an open-source app for people in Iran. It is not a clone of either site’s index or brand.

---

## Problem

General web search for someone in Iran is a foreign product: Persian is second, the index and the query log sit outside the country, and there is no open-source altr.lab app you can host and inspect. DuckDuckGo shows the privacy stance. Google shows the result-page job. Neither is an open engine aimed at this audience.

## Concept

An open-source search app: a query box, a ranked results list, Persian-first, with a path to an index you control. Phase 1 is the app over a small corpus you already have. Crawling the open web is a later phase, after the results page is real.

## Who it is for

You, searching in Persian (and English) and wanting an engine whose code and, later, index you can run. A public instance comes after the local loop works.

## Core capabilities

- **Query and results** — one box, a list of title, URL, and snippet.
- **Persian-first** — queries and snippets in Persian, with English as a second language on the same page.
- **Privacy default** — no account required to search; the app does not build a profile from the query.
- **Own the box** — open source, self-hostable, so the query does not have to leave a machine you run.

## Product phases

| Phase | Name | User-visible outcome | Depends on |
|-------|------|----------------------|------------|
| 1 | Results page | A query against a small local corpus returns a ranked list | A fixture corpus, not a crawler |
| 2 | Index you can rebuild | The same page reads an index you can wipe and rebuild from that corpus | Phase 1 |
| 3 | Persian ranking | Persian queries outrank junk for a handful of topics you care about | Phase 2 |
| 4 | Wider crawl | New documents enter the index from a crawl you configure | Phase 2, and a written allowlist |

A public Iranian instance, ads, and an image/news tab stay out of these phases.

## Monetization hypothesis

Open source. A later hosted instance could charge for an API or for removing a small sponsor line. No revenue story until phase 1 answers real queries from the fixture corpus.

## Stack synergy

Apolyx for the results page. Jord only if the index metadata should live in the shared database; the index itself may be a dedicated file. Decide that in the sharpening note. Do not invent a second database client.

## Open questions

1. Product name?
2. Phase 1 corpus: a folder of pages you curate, or a dump you already have?
3. Persian handling in phase 3: normalize characters only, or stemming too?
4. Is the first deploy your laptop, or a server in Iran?
5. Privacy rule: store zero query logs, or store anonymous counts with no user id?

## When this track is chosen

Add a sharpening note with: the name, the phase-1 corpus, the result fields (title, URL, snippet), and where the app lives. Non-goals for that note: a general web crawl, image search, ads, and an account system.
