/**
 * S0083 — channel naming + policy-gated join.
 *
 * A channel is `<table>` or `<table>:<rowId>`. Table idents cannot contain
 * `:`, so the first colon splits unambiguously.
 *
 * Rule (fail closed):
 * - `<table>:<id>`: the row must exist and the caller's `select` policy must
 *   allow that row. Missing row, read error or policy error = deny.
 * - `<table>`: the caller's `select` must be allowed with **no row scope**
 *   (a caller limited to its own rows cannot join a table-wide channel,
 *   because broadcasts there are not tied to rows it may read).
 */

import type { PolicyDecision } from "../policies/evaluate.js";
import type { Principal } from "../auth/principal.js";
import { isRealtimeSubscribeTable } from "./types.js";

export type ChannelRef = { channel: string; table: string; id: string | null };

const MAX_ROW_ID = 200;
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f]/;

export function parseChannelRef(raw: string | undefined | null): ChannelRef | { error: string } {
  const value = (raw ?? "").trim();
  if (!value) return { error: "channel is required (<table> or <table>:<rowId>)" };
  const idx = value.indexOf(":");
  const table = idx === -1 ? value : value.slice(0, idx);
  const id = idx === -1 ? null : value.slice(idx + 1);
  if (!isRealtimeSubscribeTable(table)) {
    return { error: "channel table must be records or a non-reserved user-table identifier" };
  }
  if (id != null && (id.length === 0 || id.length > MAX_ROW_ID || CONTROL.test(id))) {
    return { error: `channel row id must be 1..${MAX_ROW_ID} printable characters` };
  }
  return { channel: id == null ? table : `${table}:${id}`, table, id };
}

/**
 * `reason` is internal (logs / tests). The HTTP body is uniform
 * (`deniedChannelBody`) so a denied caller cannot tell a missing row from a
 * row it may not read.
 */
export type ChannelVerdict =
  | { allowed: true }
  | { allowed: false; reason: "policy" | "row_scoped" | "row_unavailable" | "check_failed" };

/**
 * Per-principal cap key for presence sockets: the uid when present, else
 * kind + role + client IP (x-forwarded-for first hop, else socket address).
 * Server-side only; never sent to clients.
 */
export function channelPrincipalKey(
  principal: Principal,
  forwardedFor: string | undefined,
  remoteAddress?: string | null,
): string {
  if (principal.uid) return `uid:${principal.uid}`;
  const ip =
    forwardedFor?.split(",")[0]?.trim().slice(0, 64) ||
    remoteAddress?.slice(0, 64) ||
    "unknown";
  return `${principal.kind}:${principal.role}@${ip}`;
}

/** `JORD_PRESENCE_MAX_PER_PRINCIPAL` override (positive integer), else null. */
export function presencePerPrincipalFromEnv(
  env: Record<string, string | undefined>,
): number | null {
  const raw = env.JORD_PRESENCE_MAX_PER_PRINCIPAL?.trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function deniedChannelBody(channel: string) {
  return { error: "policy_denied" as const, operation: "select" as const, channel };
}

export async function authorizeChannel(input: {
  principal: Principal;
  ref: ChannelRef;
  decide: (
    principal: Principal,
    table: string,
    operation: "select",
    extra?: { bucket?: string | null; row?: Record<string, unknown> | null },
  ) => Promise<PolicyDecision>;
  /** Row by pk; null when missing. `bucket` for the records table. */
  readRow: (
    table: string,
    id: string,
  ) => Promise<{ row: Record<string, unknown>; bucket?: string | null } | null>;
}): Promise<ChannelVerdict> {
  const { principal, ref } = input;
  try {
    if (ref.id == null) {
      const decision = await input.decide(principal, ref.table, "select");
      if (!decision.allowed) return { allowed: false, reason: "policy" };
      if (decision.scope) return { allowed: false, reason: "row_scoped" };
      return { allowed: true };
    }
    // Policy first: a caller with no select on the table is denied before any
    // row read, so missing vs existing rows cost the same for it.
    const tableDecision = await input.decide(principal, ref.table, "select");
    if (!tableDecision.allowed) return { allowed: false, reason: "policy" };
    const found = await input.readRow(ref.table, ref.id);
    // A missing row still runs the row decision (empty row) so the missing
    // and denied paths do the same work. Same 403 body either way.
    const decision = await input.decide(principal, ref.table, "select", {
      row: found?.row ?? {},
      bucket: found?.bucket ?? null,
    });
    if (!found) return { allowed: false, reason: "row_unavailable" };
    if (!decision.allowed) return { allowed: false, reason: "policy" };
    return { allowed: true };
  } catch (err) {
    console.error("[@altr/jord-server] channel authorization failed", err);
    return { allowed: false, reason: "check_failed" };
  }
}
