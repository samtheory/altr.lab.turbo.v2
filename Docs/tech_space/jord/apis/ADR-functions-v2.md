---
title: "ADR — Jord Functions v2 runtime (S0026)"
description: "Evaluate TS handlers vs worker_threads vs isolated-vm; recommend worker_threads; no runtime until a follow-up sprint is approved"
created: 2026-10-25
updated: 2026-10-25
tags:
  - tech-space
  - jord
  - apis
  - adr
  - Jord-S0026
  - functions
---

# ADR — Functions v2 runtime

> Sprint: [[../../../plan/Jord/phase-02/Jord-S0026/README]]. **Execution #12.** Status: **written — recommend (b); do not implement.** Hats: **sindri** · **heimdall**. Category: [[README]].

## Context

Phase-01 / phase-02 today expose **built-in function steps** only (`echo`, `records_*`, …) via `jord_functions` and `POST /functions/:id/invoke`. There is **no** user-uploaded TypeScript, no `eval`, and no worker pool. Studio and operators will eventually want custom handlers; this ADR picks the execution model **before** any product code lands.

Hard constraints that already apply:

- No new node-gyp / native deps (phase-02 invariant #7; plan review rejects `isolated-vm`).
- Policy and write queue stay in `@altr/jord-server` — handlers must not become a bypass.
- Browser / Studio never run handlers; only the server process (or a controlled child) may.

## Options

| Id | Option | Isolation | Timeout | Build / ops | Verdict |
|----|--------|-----------|---------|-------------|---------|
| **(a)** | Registered TS handlers loaded from a directory into the API process | Weak — same V8 isolate, shared heap, can block the event loop | Hard to enforce without cooperating code | Simple; no extra deps | **Rejected as the default.** Acceptable only as a trusted-operator escape hatch, not for tenant/user code |
| **(b)** | `worker_threads` + wall-clock timeout + restricted message API | Process-shared but separate V8 isolate; CPU/memory still shared with the parent | Parent can `terminate()` the worker after a deadline | Pure Node; no native addon | **Recommended default** |
| **(c)** | `isolated-vm` | Stronger isolate + memory caps | Good wall-clock / memory controls | **Native / node-gyp**; breaks Windows CI and invariant #7 | **Rejected.** Not a candidate |

Bun runtimes are out of scope for Jord (plan non-goal).

## Decision

**Recommend (b) `worker_threads`** for any future Functions v2 implementation sprint.

Handlers would:

1. Load only from an operator-controlled path or a reviewed artifact store (not arbitrary HTTP upload in v1 of the runtime).
2. Speak a **restricted context**: JSON-serializable request/response over `MessageChannel` / `postMessage`. No direct `fs`, no raw sockets, no DB handles passed into the worker.
3. Call Jord only through parent-mediated RPCs the server already authorizes (same policy gate as HTTP / built-in steps).
4. Be subject to a **wall-clock timeout**; on expiry the parent terminates the worker and returns a typed error (e.g. `function_timeout`).

**(a)** remains documented as a non-default path for **trusted in-repo** steps that Jord itself ships (today’s built-in step runner already covers that shape). It is not the model for user TypeScript.

**(c)** stays rejected permanently under current build constraints.

## Risks (of the recommended path)

| Risk | Mitigation in a future implementation sprint |
|------|-----------------------------------------------|
| Worker still shares host CPU / RAM (DoS via busy loop or large alloc) | Hard wall-clock timeout + optional per-invoke memory soft limits; concurrency cap on in-flight workers; rate limits already on data routes (S0028) |
| Accidental privilege if parent forwards a privileged DB client | Never pass adapters or secrets into the worker; only allowlisted RPC methods that re-check the principal |
| Message-passing serialization cost / non-cloneable values | Restrict payload to JSON; reject oversized bodies (reuse 1 MiB JSON cap culture) |
| Stale worker code after deploy | Explicit reload / version pin; no hot-swap of running workers without restart |
| Prototype pollution / untrusted `require` | Worker entry uses a fixed bootstrap; no dynamic `require` of user paths beyond the registered module; prefer ESM import of a single file |

## Timeout model (design contract)

| Knob | Intent (for the future sprint; **not implemented here**) |
|------|----------------------------------------------------------|
| Default deadline | Short (on the order of a few seconds per invoke) |
| Hard cap | Operator-configurable upper bound; reject configs above the cap |
| On timeout | `worker.terminate()`; invoke fails closed; no partial write committed by the worker itself (writes only via parent RPC inside the write queue) |
| Concurrency | Bounded pool; queue or 429 when saturated |

Exact numbers are left to the implementation card; this ADR only requires that a wall-clock terminate path exists and that writes stay on the parent queue.

## Non-goals / stays out

Until a **follow-up sprint is explicitly approved**:

- No product code path for user workers (`worker_threads` pool, loader, RPC bridge, Studio upload UI).
- No arbitrary network from handlers.
- No filesystem access from handlers (read or write).
- No `eval` / `new Function` / dynamic transpile of untrusted source in-process.
- No Bun, no `isolated-vm`, no second cloud process solely for functions.
- Built-in step runner (`cloud/jord/src/functions/`) stays as-is.

## Consequences

- **STATUS** and this ADR record an explicit **“do not implement”** gate: Functions v2 **runtime** waits for a new approved sprint after this ADR.
- Soft backlog already lists “Functions v2 **implementation** — only after S0026 ADR approval” ([[../../../plan/Jord/phase-02/00-remaining-backlog]]).
- Feature F8 acceptance is **written ADR only** — satisfied by this document.

## Acceptance (2026-10-25)

| Check | Result |
|-------|--------|
| Written recommendation defaults to (b) with risk analysis | This ADR |
| (c) `isolated-vm` rejected | Explicit above |
| Timeout model + what stays out recorded | Sections above |
| Explicit “do not implement” gate in STATUS | [[../../../report/STATUS]] |
| No runtime / worker product code in this card | Confirmed — docs only |

## Links

- Plan card: [[../../../plan/Jord/phase-02/Jord-S0026/README]]
- Feature F8: [[../../../feature_list/Jord/03-phase-02-features#f8--functions-v2-jord-s0026-adr-only]]
- As-built APIs (built-in steps today): [[README]]
- Phase-02 queue: [[../../../plan/Jord/phase-02/README]]
