import { createHmac } from "node:crypto";

import type { AesGcmSecretPort, JordDriverPort, SecretPort } from "@altr/jord";

/**
 * S0093 — shared persistence for signing-key sets (`jord_key_sets`, 0028).
 * One row per key family. Secrets are always sealed by the secret port;
 * nothing here ever returns or logs plaintext except to the in-process caller
 * that needs the key to sign/verify.
 *
 * A row is written with ONE upsert (current + previous + expiry + fingerprints
 * + revoke marker together), so a rotation is all-or-nothing.
 */

export type KeySetId = "jwt" | "blob_hmac";

export type KeySetRow = {
  id: KeySetId;
  /** NULL = "use the env key" (operator reset, or only a revoke marker). */
  currentSealed: string | null;
  currentFingerprint: string | null;
  previousSealed: string | null;
  previousFingerprint: string | null;
  previousExpiresAt: number | null;
  /**
   * Operator revoked the retiring key: no previous key verifies (stored or
   * env, e.g. `JORD_JWT_SECRET_PREVIOUS`) until the next rotation clears it.
   */
  previousRevoked: boolean;
  rotatedAt: number | null;
};

/** Hard ceiling for any overlap window: 7 days. */
export const MAX_OVERLAP_SECONDS = 7 * 24 * 60 * 60;
/**
 * Overlap used when `overlap_seconds` is omitted. An explicit `0` always
 * means "no overlap" for every key type.
 *   JWT: 0 (legacy: a bare rotate kills old tokens at once; overlap is opt-in)
 *   blob: 2 h (signed URLs live at most 1 h)
 *   project keys: 24 h (time to redeploy clients)
 */
export const DEFAULT_JWT_OVERLAP_SECONDS = 0;
export const DEFAULT_BLOB_OVERLAP_SECONDS = 2 * 60 * 60;
export const DEFAULT_PROJECT_KEY_OVERLAP_SECONDS = 24 * 60 * 60;

/** Resolve the effective overlap: omitted → default, explicit 0 → 0, capped. */
export function effectiveOverlapSeconds(input: {
  overlapSeconds: number | undefined;
  revokePrevious: boolean | undefined;
  defaultSeconds: number;
}): number {
  if (input.revokePrevious) return 0;
  const raw = input.overlapSeconds ?? input.defaultSeconds;
  if (!Number.isFinite(raw)) return 0;
  return Math.min(Math.max(0, Math.floor(raw)), MAX_OVERLAP_SECONDS);
}

/** Domain separation for fingerprint keys; bump the version to re-key. */
export const FINGERPRINT_CONTEXT = "jord:fingerprint:v1";

/**
 * Keyed fingerprint: HMAC-SHA256(k, secret)[:12 hex] with
 * k = HMAC-SHA256(base, "jord:fingerprint:v1"). `base` is a server-held
 * secret (the server token), so a published fingerprint cannot be used to
 * test candidate signing secrets offline. Stable while `base` is unchanged.
 */
export function createFingerprinter(base: string): (secret: string) => string {
  const key = createHmac("sha256", base).update(FINGERPRINT_CONTEXT).digest();
  return (secret) =>
    createHmac("sha256", key).update(secret, "utf8").digest("hex").slice(0, 12);
}

function ph(jord: JordDriverPort, n: number): string {
  return jord.dialect === "postgres" ? `$${n}` : "?";
}

function numOrNull(value: unknown): number | null {
  return value == null ? null : Number(value);
}

function strOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/** Parse an operator-supplied overlap. `undefined` means "not requested". */
export function parseOverlapSeconds(
  raw: unknown,
): { ok: true; seconds: number | undefined } | { ok: false; error: string } {
  if (raw === undefined || raw === null) return { ok: true, seconds: undefined };
  if (
    typeof raw !== "number" ||
    !Number.isInteger(raw) ||
    raw < 0 ||
    raw > MAX_OVERLAP_SECONDS
  ) {
    return {
      ok: false,
      error: `overlap_seconds must be an integer 0-${MAX_OVERLAP_SECONDS}`,
    };
  }
  return { ok: true, seconds: raw };
}

/**
 * `null` = no row (the env key may be used). A read failure THROWS: callers
 * must never treat "could not read" as "no row".
 */
export async function loadKeySet(
  jord: JordDriverPort,
  id: KeySetId,
): Promise<KeySetRow | null> {
  const rows = await jord.query(
    `SELECT id, current_sealed, current_fingerprint, previous_sealed,
            previous_fingerprint, previous_expires_at, previous_revoked,
            rotated_at
       FROM jord_key_sets WHERE id = ${ph(jord, 1)} LIMIT 1`,
    [id],
  );
  const row = rows[0] as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    id,
    currentSealed: strOrNull(row.current_sealed),
    currentFingerprint: strOrNull(row.current_fingerprint),
    previousSealed: strOrNull(row.previous_sealed),
    previousFingerprint: strOrNull(row.previous_fingerprint),
    previousExpiresAt: numOrNull(row.previous_expires_at),
    previousRevoked: Number(row.previous_revoked ?? 0) === 1,
    rotatedAt: numOrNull(row.rotated_at),
  };
}

/** Single-statement upsert of the whole key set (atomic on its own). */
export async function saveKeySet(
  jord: JordDriverPort,
  row: KeySetRow,
): Promise<void> {
  const p = (n: number) => ph(jord, n);
  const ex = jord.dialect === "postgres" ? "EXCLUDED" : "excluded";
  await jord.query(
    `INSERT INTO jord_key_sets (
       id, current_sealed, current_fingerprint, previous_sealed,
       previous_fingerprint, previous_expires_at, previous_revoked,
       rotated_at, updated_at
     ) VALUES (${p(1)},${p(2)},${p(3)},${p(4)},${p(5)},${p(6)},${p(7)},${p(8)},${p(9)})
     ON CONFLICT (id) DO UPDATE SET
       current_sealed = ${ex}.current_sealed,
       current_fingerprint = ${ex}.current_fingerprint,
       previous_sealed = ${ex}.previous_sealed,
       previous_fingerprint = ${ex}.previous_fingerprint,
       previous_expires_at = ${ex}.previous_expires_at,
       previous_revoked = ${ex}.previous_revoked,
       rotated_at = ${ex}.rotated_at,
       updated_at = ${ex}.updated_at`,
    [
      row.id,
      row.currentSealed,
      row.currentFingerprint,
      row.previousSealed,
      row.previousFingerprint,
      row.previousExpiresAt,
      row.previousRevoked ? 1 : 0,
      row.rotatedAt,
      Date.now(),
    ],
  );
}

/** Thrown when a stored key set exists but cannot be used (fail closed). */
export class KeySetUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KeySetUnavailableError";
  }
}

export function requireSealPort(
  secrets: SecretPort | null,
  what: string,
): AesGcmSecretPort {
  if (!secrets) {
    throw new Error(`JORD_MASTER_KEY is required to store a rotated ${what}`);
  }
  if (typeof (secrets as AesGcmSecretPort).peekSealed !== "function") {
    throw new Error(`secret port must support peekSealed for ${what} rotation`);
  }
  return secrets as AesGcmSecretPort;
}

/**
 * Seal `plaintext` under a stable id. The in-memory port forgets ids on
 * restart, so "exists" is decided by the port, not by the database row.
 */
export async function sealFresh(
  port: AesGcmSecretPort,
  id: string,
  plaintext: string,
): Promise<string> {
  if (port.peekSealed(id)) await port.rotate(id, plaintext);
  else await port.putSecret(id, plaintext);
  const sealed = port.peekSealed(id);
  if (!sealed) throw new Error("failed to seal key material");
  return sealed;
}

/** Audit row in `jord_logs`. Callers pass non-secret detail only. */
export async function auditKeyEvent(
  jord: JordDriverPort,
  input: {
    source: string;
    message: string;
    actor: string | null;
    action: string;
    detail?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    const meta = JSON.stringify({
      actor: input.actor,
      action: input.action,
      ...(input.detail ?? {}),
    });
    await jord.query(
      `INSERT INTO jord_logs (id, at, level, source, message, meta_json)
       VALUES (${ph(jord, 1)}, ${ph(jord, 2)}, 'info', ${ph(jord, 3)}, ${ph(jord, 4)}, ${ph(jord, 5)})`,
      [crypto.randomUUID(), Date.now(), input.source, input.message, meta],
    );
  } catch (err) {
    console.error("[@altr/jord-server] key audit failed", err);
  }
}
