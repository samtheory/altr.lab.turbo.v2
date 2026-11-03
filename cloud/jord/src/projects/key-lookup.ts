/**
 * S0084 — resolve a presented project API key to its project + kind.
 *
 * Keys are stored only as SHA-256 hex (`jord_project_keys.key_hash`); the
 * lookup is by hash, then the stored hash is re-compared in constant time.
 * A retiring key still inside its overlap window (`jord_project_key_previous`,
 * S0093) also resolves; that table is optional (older databases) and a read
 * failure there is treated as "not found" (fail closed), but logged (at most
 * once a minute per cause) so operators notice a missing table or a
 * permission problem.
 *
 * This is the ONE project-key verifier: `registry.verifyProjectKey` delegates
 * here.
 */

import { timingSafeEqual } from "node:crypto";

import type { JordDriverPort } from "@altr/jord";

import { hashProjectKey } from "./keys.js";

export type ProjectRef = {
  id: string;
  slug: string;
  status: string;
};

export type ProjectKeyMatch = {
  projectId: string;
  kind: string;
  keyHash: string;
  /** True when matched through the retiring-key overlap table. */
  previous: boolean;
  /** Epoch ms when a retiring key stops verifying; null for current keys. */
  expiresAt?: number | null;
};

const LOG_EVERY_MS = 60_000;
const lastLogged = new Map<string, number>();

function classifyLookupError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/no such table|does not exist|undefined_table|42P01/i.test(msg)) {
    return "table_missing";
  }
  if (/permission denied|not authorized|42501|SQLITE_AUTH/i.test(msg)) {
    return "permission_denied";
  }
  return "read_failed";
}

/** Rate-limited (once per minute per cause) error log. Never logs key data. */
function logLookupError(err: unknown, nowMs: number = Date.now()): void {
  const cause = classifyLookupError(err);
  const last = lastLogged.get(cause) ?? 0;
  if (nowMs - last < LOG_EVERY_MS && last !== 0) return;
  lastLogged.set(cause, nowMs);
  const detail =
    cause === "table_missing"
      ? "jord_project_key_previous is missing (run migration 0028); retiring project keys are rejected"
      : cause === "permission_denied"
        ? "permission denied reading jord_project_key_previous; retiring project keys are rejected"
        : "jord_project_key_previous read failed; retiring project keys are rejected";
  console.error(
    `[@altr/jord-server] project key lookup ${cause}: ${detail}`,
    err instanceof Error ? err.message : String(err),
  );
}

/** @internal Test hook: forget the rate-limit window. */
export function resetKeyLookupLogState(): void {
  lastLogged.clear();
}

function ph(jord: JordDriverPort, n: number): string {
  return jord.dialect === "postgres" ? `$${n}` : "?";
}

/** Constant-time equality of two hex digests (false on any shape mismatch). */
export function sameKeyHash(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  if (left.length !== 32 || right.length !== 32) return false;
  return timingSafeEqual(left, right);
}

/** Project by immutable slug or id; any status (caller decides on archived). */
export async function findProjectRef(
  jord: JordDriverPort,
  ref: string,
): Promise<ProjectRef | null> {
  const trimmed = ref.trim();
  if (!trimmed || trimmed.length > 128) return null;
  const rows = await jord.query(
    `SELECT id, slug, status FROM jord_projects
     WHERE slug = ${ph(jord, 1)} OR id = ${ph(jord, 2)}
     LIMIT 1`,
    [trimmed, trimmed],
  );
  const row = rows[0];
  if (!row) return null;
  return { id: String(row.id), slug: String(row.slug), status: String(row.status) };
}

export async function findProjectKeyByHash(
  jord: JordDriverPort,
  keyHash: string,
  nowMs: number = Date.now(),
): Promise<ProjectKeyMatch | null> {
  const rows = await jord.query(
    `SELECT project_id, kind, key_hash FROM jord_project_keys
     WHERE key_hash = ${ph(jord, 1)} LIMIT 1`,
    [keyHash],
  );
  const row = rows[0];
  if (row && sameKeyHash(String(row.key_hash), keyHash)) {
    return {
      projectId: String(row.project_id),
      kind: String(row.kind),
      keyHash,
      previous: false,
      expiresAt: null,
    };
  }
  try {
    const prev = await jord.query(
      `SELECT project_id, kind, key_hash, expires_at FROM jord_project_key_previous
       WHERE key_hash = ${ph(jord, 1)} AND expires_at > ${ph(jord, 2)} LIMIT 1`,
      [keyHash, nowMs],
    );
    const p = prev[0];
    if (p && sameKeyHash(String(p.key_hash), keyHash)) {
      return {
        projectId: String(p.project_id),
        kind: String(p.kind),
        keyHash,
        previous: true,
        expiresAt: Number(p.expires_at),
      };
    }
  } catch (err) {
    // Fail closed (no retiring keys), but tell the operator why.
    logLookupError(err);
  }
  return null;
}

export function findProjectKey(
  jord: JordDriverPort,
  plaintext: string,
): Promise<ProjectKeyMatch | null> {
  return findProjectKeyByHash(jord, hashProjectKey(plaintext));
}
