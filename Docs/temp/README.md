---
title: "Docs temp — ephemeral staging"
description: "Temporary input/output drop zone for prompts and scratch docs; not vault truth"
created: 2026-10-27
updated: 2026-10-27
tags:
  - temp
  - staging
  - ephemeral
---

# Docs temp

> Scratch staging only. **Not** part of the truth order. Do not treat files here as shipped intent or as-built.

## Folders

| Path | Use |
|------|-----|
| [[input/README\|input/]] | Drop files **from elsewhere** (prompts, exports, notes to process) |
| [[output/README\|output/]] | Drop files **generated here** to pass elsewhere (prompts, drafts, exports) |

## Rules

1. Ephemeral — delete or clear when done; do not grow a permanent archive here.
2. Not truth — never cite `temp/` over `tech_space/`, `feature_list/`, or code.
3. Promote deliberately — lasting content moves into `idea/` → `feature_list/` → …; do not “ship” from `temp/` alone.
4. Secrets — do not put credentials, tokens, or private URLs here.
5. Git — payload files under `input/` and `output/` are gitignored; only the README files are tracked.

Living map: [[../brain/00-Docs-Brain]] · Hub: [[../brain/00-Docs-Hub]].
