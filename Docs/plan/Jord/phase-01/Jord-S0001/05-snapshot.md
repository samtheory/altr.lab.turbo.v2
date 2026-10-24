---
title: "Phase 5 — snapshot and gitignore"
description: "SQLite online backup script and a gitignore rule for the live database file"
created: 2026-10-18
updated: 2026-10-18
tags:
  - plan
  - jord
  - Jord-S0001
---

# Phase 5 — snapshot and gitignore

> Who: implementer. The live file stays untracked.

Sprint index: [[README]] · Intent: [[../../../../feature_list/Jord/00-intent]]

## Behavior

- Root script `pnpm db:snapshot` calls a function in `@altr/jord` that uses the SQLite online backup API (libSQL backup), not a raw copy of a file that may be mid-write.
- Destination: `data/snapshots/jord-<timestamp>.db` (or the path printed by the script). Snapshots are gitignored with the live file.
- Root `.gitignore` gains `data/*.db` and `data/**/*.db` so `jord.db`, `jord.db-wal`, `jord.db-shm`, and snapshot files stay out of git.

## Tasks

- [ ] Backup helper + root script
- [ ] Gitignore lines
- [ ] Test or manual check: snapshot file exists and `sqlite`/`libsql` can open it read-only

## Done when

`git check-ignore -v data/jord.db` matches the new rule, and one snapshot file is produced from an open database.
