import { randomBytes } from "node:crypto";

import { HTTPException } from "hono/http-exception";

import type { JordDriverPort, SecretPort } from "@altr/jord";

import type { JordAuthConfig } from "./config.js";
import { CURRENT_KID, PREVIOUS_KID, type JwtKey } from "./jwt.js";
import {
  DEFAULT_JWT_OVERLAP_SECONDS,
  KeySetUnavailableError,
  createFingerprinter,
  effectiveOverlapSeconds,
  loadKeySet,
  requireSealPort,
  saveKeySet,
  sealFresh,
  type KeySetRow,
} from "./key-sets.js";
import { AUTH_SETTINGS_ID } from "./settings.js";

/** Secret-port id for the project's rotated JWT signing key. */
export const JWT_SECRET_ID = "auth.jwt.key";
/** Secret-port id for the retiring (overlap) JWT key, S0093. */
export const JWT_PREVIOUS_SECRET_ID = "auth.jwt.key.previous";
const CACHE_MS = 5_000;
/** After a failed re-read, the last good snapshot is trusted this long. */
const STALE_MAX_MS = 60_000;

export type JwtKeySource = "env" | "database" | "none";

export type JwtKeyInfo = {
  /** Where the signing key comes from right now. */
  source: JwtKeySource;
  /** Keyed, non-secret fingerprint (12 hex) used to tell keys apart. */
  fingerprint: string | null;
  rotatedAt: number | null;
  configured: boolean;
  /**
   * False when a stored key set exists but cannot be read/unsealed: the
   * server is failing closed (no issuance, no DB-era verification).
   */
  available: boolean;
  /**
   * Retiring key still accepted for verification (non-secret). `env` =
   * `JORD_JWT_SECRET_PREVIOUS` (no expiry, `expiresAt: null`).
   */
  previous: {
    fingerprint: string | null;
    expiresAt: number | null;
    source: "database" | "env";
  } | null;
  /** Operator revoked the previous key; it stays off until the next rotate. */
  previousRevoked: boolean;
};

export type JwtRotateOptions = {
  /**
   * Keep the outgoing key verifying for this many seconds. Omitted uses
   * DEFAULT_JWT_OVERLAP_SECONDS (0, legacy: old tokens die at once); an
   * explicit 0 is always "no overlap".
   */
  overlapSeconds?: number;
  /** Drop any previous key at once, even if overlapSeconds is set. */
  revokePrevious?: boolean;
};

export type JwtKeyring = {
  /** Signing key. Throws HTTP 503 while a stored key set is unusable. */
  current(): Promise<string | null>;
  /** Verification keys. Never throws; `[]` while failing closed. */
  keys(): Promise<JwtKey[]>;
  info(): Promise<JwtKeyInfo>;
  invalidate(): void;
  /** Replace the signing key with a fresh random secret (needs the master key). */
  rotate(options?: JwtRotateOptions): Promise<JwtKeyInfo>;
  /** S0093: drop the retiring key immediately (emergency revoke). */
  revokePrevious(): Promise<JwtKeyInfo>;
  /** Drop the stored key and fall back to `JORD_JWT_SECRET`. */
  reset(): Promise<JwtKeyInfo>;
};

type PreviousKey = {
  secret: string;
  fingerprint: string | null;
  expiresAt: number;
};

type Snapshot = {
  /** When this snapshot was last (re)validated. */
  at: number;
  /** When the database was last read successfully. */
  loadedOkAt: number;
  status: "ok" | "unavailable";
  secret: string | null;
  source: JwtKeySource;
  previous: PreviousKey | null;
  previousRevoked: boolean;
  rotatedAt: number | null;
};

/** What the database says about the JWT key, before unsealing. */
type StoredJwtKey = {
  /** Row in jord_key_sets (authoritative when present). */
  set: KeySetRow | null;
  /** Current sealed key: key-set row, else legacy auth-settings column. */
  currentSealed: string | null;
  rotatedAt: number | null;
};

function placeholder(jord: JordDriverPort, n: number): string {
  return jord.dialect === "postgres" ? `$${n}` : "?";
}

/** Legacy (S0071) location of the sealed key. Throws on read failure. */
async function loadLegacyKey(
  jord: JordDriverPort,
): Promise<{ sealed: string | null; rotatedAt: number | null }> {
  const rows = await jord.query(
    `SELECT jwt_key_sealed, jwt_key_rotated_at
       FROM jord_auth_settings WHERE id = ${placeholder(jord, 1)} LIMIT 1`,
    [AUTH_SETTINGS_ID],
  );
  const row = rows[0] as Record<string, unknown> | undefined;
  if (!row) return { sealed: null, rotatedAt: null };
  return {
    sealed: typeof row.jwt_key_sealed === "string" ? row.jwt_key_sealed : null,
    rotatedAt:
      row.jwt_key_rotated_at == null ? null : Number(row.jwt_key_rotated_at),
  };
}

/** Throws on any read error ("could not read" is never "no row"). */
async function loadStored(jord: JordDriverPort): Promise<StoredJwtKey> {
  const set = await loadKeySet(jord, "jwt");
  if (set) {
    return { set, currentSealed: set.currentSealed, rotatedAt: set.rotatedAt };
  }
  const legacy = await loadLegacyKey(jord);
  return { set: null, currentSealed: legacy.sealed, rotatedAt: legacy.rotatedAt };
}

/** Clear the legacy column so jord_key_sets is the single source of truth. */
async function clearLegacyKey(
  jord: JordDriverPort,
  fingerprint: string | null,
  rotatedAt: number,
): Promise<void> {
  const p = (n: number) => placeholder(jord, n);
  await jord.query(
    `UPDATE jord_auth_settings
        SET jwt_key_sealed = NULL, jwt_key_fingerprint = ${p(1)},
            jwt_key_rotated_at = ${p(2)}
      WHERE id = ${p(3)}`,
    [fingerprint, rotatedAt, AUTH_SETTINGS_ID],
  );
}

/**
 * Signing key resolution for one server process (S0071, S0093).
 *
 * Source of truth: `jord_key_sets` row `jwt` (current + previous, sealed,
 * written in one transaction). Without that row the legacy
 * `jord_auth_settings.jwt_key_sealed` column is read; only when neither holds
 * a key is `JORD_JWT_SECRET` used.
 *
 * Fail closed: if a stored key exists but cannot be unsealed (or the database
 * cannot be read and no recent good snapshot exists), `keys()` returns `[]`
 * and `current()` throws 503. The env key is never used as a fallback for a
 * stored key. The snapshot is cached ~5 s; rotate/revoke/reset invalidate it.
 */
export function createJwtKeyring(input: {
  jord: JordDriverPort;
  auth: JordAuthConfig;
  secrets: SecretPort | null;
  enqueueWrite: <T>(work: () => Promise<T>) => Promise<T>;
}): JwtKeyring {
  const fingerprintOf = createFingerprinter(input.auth.secret);
  let cache: Snapshot | null = null;

  function unavailable(now: number, loadedOkAt: number, reason: string): Snapshot {
    console.error(`[@altr/jord-server] JWT key set unavailable (failing closed): ${reason}`);
    return {
      at: now,
      loadedOkAt,
      status: "unavailable",
      secret: null,
      source: "database",
      previous: null,
      previousRevoked: false,
      rotatedAt: null,
    };
  }

  function unsealStored(stored: StoredJwtKey, now: number): Snapshot {
    const previousRevoked = stored.set?.previousRevoked ?? false;
    let secret: string | null = input.auth.jwtSecret;
    let source: JwtKeySource = secret ? "env" : "none";
    if (stored.currentSealed) {
      if (!input.secrets) {
        return unavailable(now, now, "stored key present but JORD_MASTER_KEY is unset");
      }
      try {
        secret = input.secrets.unseal(stored.currentSealed);
        source = "database";
      } catch (err) {
        console.error("[@altr/jord-server] stored JWT key could not be unsealed", err);
        return unavailable(now, now, "stored key could not be unsealed");
      }
    }

    let previous: PreviousKey | null = null;
    const set = stored.set;
    if (
      !previousRevoked &&
      set?.previousSealed &&
      set.previousExpiresAt != null &&
      input.secrets
    ) {
      try {
        previous = {
          secret: input.secrets.unseal(set.previousSealed),
          fingerprint: set.previousFingerprint,
          expiresAt: set.previousExpiresAt,
        };
      } catch (err) {
        // Fail closed for the retiring key only: fewer keys, never the env one.
        console.error(
          "[@altr/jord-server] previous JWT key could not be unsealed; not accepting it",
          err,
        );
      }
    }
    return {
      at: now,
      loadedOkAt: now,
      status: "ok",
      secret,
      source,
      previous,
      previousRevoked,
      rotatedAt: stored.rotatedAt,
    };
  }

  async function snapshot(): Promise<Snapshot> {
    const now = Date.now();
    if (cache && now - cache.at < CACHE_MS) return cache;
    try {
      cache = unsealStored(await loadStored(input.jord), now);
    } catch (err) {
      console.error("[@altr/jord-server] JWT key set read failed", err);
      if (cache && cache.status === "ok" && now - cache.loadedOkAt <= STALE_MAX_MS) {
        // Keep the last state read from the database (not an env fallback).
        cache = { ...cache, at: now };
      } else {
        cache = unavailable(now, cache?.loadedOkAt ?? 0, "database read failed");
      }
    }
    return cache;
  }

  function keysOf(snap: Snapshot, now: number): JwtKey[] {
    if (snap.status !== "ok") return [];
    const keys: JwtKey[] = [];
    if (snap.secret) keys.push({ kid: CURRENT_KID, secret: snap.secret });
    const live = snap.previous && snap.previous.expiresAt > now ? snap.previous : null;
    if (live) {
      keys.push({ kid: PREVIOUS_KID, secret: live.secret });
    } else if (
      snap.source !== "database" &&
      !snap.previousRevoked &&
      input.auth.jwtSecretPrevious
    ) {
      // The env `previous` key only participates while no stored key is in
      // use and the operator has not revoked it.
      keys.push({ kid: PREVIOUS_KID, secret: input.auth.jwtSecretPrevious });
    }
    return keys;
  }

  function infoOf(snap: Snapshot, now: number): JwtKeyInfo {
    if (snap.status !== "ok") {
      return {
        source: "database",
        fingerprint: null,
        rotatedAt: snap.rotatedAt,
        configured: false,
        available: false,
        previous: null,
        previousRevoked: snap.previousRevoked,
      };
    }
    const live = snap.previous && snap.previous.expiresAt > now ? snap.previous : null;
    let previous: JwtKeyInfo["previous"] = null;
    if (live) {
      previous = {
        fingerprint: live.fingerprint,
        expiresAt: live.expiresAt,
        source: "database",
      };
    } else if (
      snap.source !== "database" &&
      !snap.previousRevoked &&
      input.auth.jwtSecretPrevious
    ) {
      previous = {
        fingerprint: fingerprintOf(input.auth.jwtSecretPrevious),
        expiresAt: null,
        source: "env",
      };
    }
    return {
      source: snap.source,
      fingerprint: snap.secret ? fingerprintOf(snap.secret) : null,
      rotatedAt: snap.rotatedAt,
      configured: Boolean(snap.secret),
      available: true,
      previous,
      previousRevoked: snap.previousRevoked,
    };
  }

  async function info(): Promise<JwtKeyInfo> {
    return infoOf(await snapshot(), Date.now());
  }

  /** Serialized write: fresh read + all statements in ONE transaction. */
  function writeTx<T>(work: (stored: StoredJwtKey) => Promise<T>): Promise<T> {
    return input.enqueueWrite(() =>
      input.jord.transaction(async () => work(await loadStored(input.jord))),
    );
  }

  return {
    async current() {
      const snap = await snapshot();
      if (snap.status !== "ok") {
        throw new HTTPException(503, {
          message: "JWT signing key is unavailable (stored key set unreadable)",
        });
      }
      return snap.secret;
    },
    async keys() {
      try {
        return keysOf(await snapshot(), Date.now());
      } catch (err) {
        console.error("[@altr/jord-server] JWT keyring failed (failing closed)", err);
        return [];
      }
    },
    info,
    invalidate() {
      cache = null;
    },
    async rotate(options) {
      const port = requireSealPort(input.secrets, "JWT signing key");
      const overlap = effectiveOverlapSeconds({
        overlapSeconds: options?.overlapSeconds,
        revokePrevious: options?.revokePrevious,
        defaultSeconds: DEFAULT_JWT_OVERLAP_SECONDS,
      });
      await writeTx(async (stored) => {
        // Read the outgoing key from the database (not the cache) so a
        // rotation never keeps a stale key as `previous`.
        const outgoingSnap = unsealStored(stored, Date.now());
        if (outgoingSnap.status !== "ok" && overlap > 0) {
          throw new KeySetUnavailableError(
            "current JWT key cannot be unsealed; rotate with revoke_previous to recover",
          );
        }
        const outgoing = outgoingSnap.status === "ok" ? outgoingSnap.secret : null;
        const next = randomBytes(32).toString("base64url");
        const rotatedAt = Date.now();
        const fingerprint = fingerprintOf(next);
        const sealed = await sealFresh(port, JWT_SECRET_ID, next);
        const keepPrevious = overlap > 0 && outgoing;
        const row: KeySetRow = {
          id: "jwt",
          currentSealed: sealed,
          currentFingerprint: fingerprint,
          previousSealed: keepPrevious
            ? await sealFresh(port, JWT_PREVIOUS_SECRET_ID, outgoing)
            : null,
          previousFingerprint: keepPrevious ? fingerprintOf(outgoing) : null,
          previousExpiresAt: keepPrevious ? rotatedAt + overlap * 1000 : null,
          // A rotation re-arms the previous slot (clears an earlier revoke).
          previousRevoked: Boolean(options?.revokePrevious),
          rotatedAt,
        };
        await saveKeySet(input.jord, row);
        await clearLegacyKey(input.jord, fingerprint, rotatedAt);
      });
      cache = null;
      return info();
    },
    async revokePrevious() {
      await writeTx(async (stored) => {
        await saveKeySet(input.jord, {
          id: "jwt",
          currentSealed: stored.currentSealed,
          currentFingerprint: stored.set?.currentFingerprint ?? null,
          previousSealed: null,
          previousFingerprint: null,
          previousExpiresAt: null,
          previousRevoked: true,
          rotatedAt: stored.rotatedAt,
        });
        if (!stored.set && stored.currentSealed) {
          // Legacy key migrated into the key-set row above.
          await clearLegacyKey(input.jord, null, stored.rotatedAt ?? Date.now());
        }
      });
      cache = null;
      return info();
    },
    async reset() {
      await writeTx(async (stored) => {
        const now = Date.now();
        await saveKeySet(input.jord, {
          id: "jwt",
          currentSealed: null,
          currentFingerprint: null,
          previousSealed: null,
          previousFingerprint: null,
          previousExpiresAt: null,
          // Keep an operator revoke in force across a reset.
          previousRevoked: stored.set?.previousRevoked ?? false,
          rotatedAt: now,
        });
        await clearLegacyKey(input.jord, null, now);
      });
      cache = null;
      return info();
    },
  };
}
