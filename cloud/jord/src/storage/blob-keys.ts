import { randomBytes } from "node:crypto";

import { HTTPException } from "hono/http-exception";

import type { JordDriverPort, SecretPort } from "@altr/jord";

import {
  DEFAULT_BLOB_OVERLAP_SECONDS,
  KeySetUnavailableError,
  createFingerprinter,
  effectiveOverlapSeconds,
  loadKeySet,
  requireSealPort,
  saveKeySet,
  sealFresh,
  type KeySetRow,
} from "../auth/key-sets.js";
import type { HmacSecretSource } from "./hmac.js";

/**
 * S0093 — blob signed-URL HMAC key set.
 *
 * Key resolution: sealed `current` in `jord_key_sets` (id `blob_hmac`) →
 * the env/base secret (`JORD_BLOB_SIGNING_SECRET` or `JORD_SERVER_TOKEN`)
 * ONLY when the database confirmed there is no stored key. Issuance always
 * uses `current`. Verification tries `current`, then `previous` only until
 * its `expiresAt` (evaluated on every verify).
 *
 * Fail closed: until the first successful read, or when a stored key cannot
 * be unsealed, `current()` throws 503 and `verifying()` returns `[]`. A read
 * error keeps the last good database state for at most 60 s, never the env key
 * in place of a stored one.
 *
 * The key lives in process memory (sync `current()` / `verifying()` so URL
 * signing and the verify routes stay synchronous); `ready()` refreshes it from
 * the database at most every few seconds so peers pick up a rotation.
 */

export const BLOB_CURRENT_SECRET_ID = "blob.hmac.current";
export const BLOB_PREVIOUS_SECRET_ID = "blob.hmac.previous";
const REFRESH_MS = 5_000;
const STALE_MAX_MS = 60_000;

export type BlobKeyInfo = {
  source: "env" | "database";
  /** Keyed fingerprint (12 hex); null while failing closed. */
  fingerprint: string | null;
  rotatedAt: number | null;
  /** False while a stored key set cannot be read/unsealed. */
  available: boolean;
  previous: { fingerprint: string | null; expiresAt: number } | null;
  previousRevoked: boolean;
};

export type BlobKeyRotateOptions = {
  /**
   * Keep the outgoing key verifying this long. Omitted = 2 h default;
   * an explicit 0 = no overlap.
   */
  overlapSeconds?: number;
  /** Compromise path: drop the outgoing key at once. */
  revokePrevious?: boolean;
};

export type BlobKeySet = HmacSecretSource & {
  ready(): Promise<void>;
  info(): BlobKeyInfo;
  rotate(options?: BlobKeyRotateOptions): Promise<BlobKeyInfo>;
  /** Stop accepting the retiring key right now (keeps `current`). */
  revokePrevious(): Promise<BlobKeyInfo>;
};

type State = {
  status: "pending" | "ok" | "unavailable";
  secret: string | null;
  source: "env" | "database";
  rotatedAt: number | null;
  previousRevoked: boolean;
  loadedOkAt: number;
  previous: {
    secret: string;
    fingerprint: string | null;
    expiresAt: number;
  } | null;
};

export function createBlobKeySet(input: {
  jord: JordDriverPort;
  secrets: SecretPort | null;
  enqueueWrite: <T>(work: () => Promise<T>) => Promise<T>;
  /** Env-derived secret used while the database holds no stored key. */
  baseSecret: string;
  /** Server-held secret keying fingerprints (the server token). */
  fingerprintKey: string;
}): BlobKeySet {
  const fingerprintOf = createFingerprinter(input.fingerprintKey);
  let state: State = {
    status: "pending",
    secret: null,
    source: "database",
    rotatedAt: null,
    previousRevoked: false,
    loadedOkAt: 0,
    previous: null,
  };
  let loadedAt = 0;
  let inflight: Promise<void> | null = null;

  function unavailable(reason: string, loadedOkAt: number): State {
    console.error(
      `[@altr/jord-server] blob key set unavailable (failing closed): ${reason}`,
    );
    return {
      status: "unavailable",
      secret: null,
      source: "database",
      rotatedAt: null,
      previousRevoked: false,
      loadedOkAt,
      previous: null,
    };
  }

  /** Turn a database row (or confirmed absence) into in-memory state. */
  function fromRow(row: KeySetRow | null, now: number): State {
    if (!row?.currentSealed) {
      return {
        status: "ok",
        secret: input.baseSecret,
        source: "env",
        rotatedAt: row?.rotatedAt ?? null,
        previousRevoked: row?.previousRevoked ?? false,
        loadedOkAt: now,
        previous: null,
      };
    }
    if (!input.secrets) {
      return unavailable("stored key present but JORD_MASTER_KEY is unset", now);
    }
    let secret: string;
    try {
      secret = input.secrets.unseal(row.currentSealed);
    } catch (err) {
      console.error("[@altr/jord-server] stored blob key could not be unsealed", err);
      return unavailable("stored key could not be unsealed", now);
    }
    let previous: State["previous"] = null;
    if (!row.previousRevoked && row.previousSealed && row.previousExpiresAt != null) {
      try {
        previous = {
          secret: input.secrets.unseal(row.previousSealed),
          fingerprint: row.previousFingerprint,
          expiresAt: row.previousExpiresAt,
        };
      } catch (err) {
        console.error(
          "[@altr/jord-server] previous blob key could not be unsealed; not accepting it",
          err,
        );
      }
    }
    return {
      status: "ok",
      secret,
      source: "database",
      rotatedAt: row.rotatedAt,
      previousRevoked: row.previousRevoked,
      loadedOkAt: now,
      previous,
    };
  }

  async function load(): Promise<void> {
    const now = Date.now();
    let row: KeySetRow | null;
    try {
      row = await loadKeySet(input.jord, "blob_hmac");
    } catch (err) {
      // A read error is NOT "no row": never fall back to the env key here.
      console.error("[@altr/jord-server] blob key set read failed", err);
      if (state.status === "ok" && now - state.loadedOkAt <= STALE_MAX_MS) return;
      state = unavailable("database read failed", state.loadedOkAt);
      return;
    }
    state = fromRow(row, now);
  }

  function livePrevious(nowMs: number): State["previous"] {
    return state.previous && state.previous.expiresAt > nowMs
      ? state.previous
      : null;
  }

  function snapshot(): BlobKeyInfo {
    const prev = livePrevious(Date.now());
    const ok = state.status === "ok" && state.secret !== null;
    return {
      source: state.source,
      fingerprint: ok && state.secret ? fingerprintOf(state.secret) : null,
      rotatedAt: state.rotatedAt,
      available: ok,
      previous: prev
        ? { fingerprint: prev.fingerprint, expiresAt: prev.expiresAt }
        : null,
      previousRevoked: state.previousRevoked,
    };
  }

  /** Serialized write: fresh read + statement(s) in ONE transaction. */
  function writeTx<T>(work: (row: KeySetRow | null) => Promise<T>): Promise<T> {
    return input.enqueueWrite(() =>
      input.jord.transaction(async () =>
        work(await loadKeySet(input.jord, "blob_hmac")),
      ),
    );
  }

  const set: BlobKeySet = {
    current() {
      if (state.status !== "ok" || state.secret === null) {
        throw new HTTPException(503, {
          message: "blob signing key is unavailable",
        });
      }
      return state.secret;
    },
    verifying(nowMs) {
      if (state.status !== "ok" || state.secret === null) return [];
      const prev = livePrevious(nowMs);
      return prev ? [state.secret, prev.secret] : [state.secret];
    },
    async ready() {
      if (state.status !== "pending" && Date.now() - loadedAt < REFRESH_MS) return;
      inflight ??= load().finally(() => {
        loadedAt = Date.now();
        inflight = null;
      });
      await inflight;
    },
    info: snapshot,
    async rotate(options) {
      const port = requireSealPort(input.secrets, "blob signing key");
      const overlap = effectiveOverlapSeconds({
        overlapSeconds: options?.overlapSeconds,
        revokePrevious: options?.revokePrevious,
        defaultSeconds: DEFAULT_BLOB_OVERLAP_SECONDS,
      });
      const next = await writeTx(async (row) => {
        // Outgoing key from a fresh database read, not the in-memory cache.
        const outgoingState = fromRow(row, Date.now());
        if (outgoingState.status !== "ok" && overlap > 0) {
          throw new KeySetUnavailableError(
            "current blob key cannot be unsealed; rotate with revoke_previous to recover",
          );
        }
        const outgoing = outgoingState.status === "ok" ? outgoingState.secret : null;
        const rotatedAt = Date.now();
        const secret = randomBytes(32).toString("base64url");
        const keep = overlap > 0 && outgoing !== null;
        const written: KeySetRow = {
          id: "blob_hmac",
          currentSealed: await sealFresh(port, BLOB_CURRENT_SECRET_ID, secret),
          currentFingerprint: fingerprintOf(secret),
          previousSealed: keep
            ? await sealFresh(port, BLOB_PREVIOUS_SECRET_ID, outgoing)
            : null,
          previousFingerprint: keep ? fingerprintOf(outgoing) : null,
          previousExpiresAt: keep ? rotatedAt + overlap * 1000 : null,
          previousRevoked: Boolean(options?.revokePrevious),
          rotatedAt,
        };
        // One upsert: current + previous + expiry + fingerprints together.
        await saveKeySet(input.jord, written);
        return {
          row: written,
          secret,
          previousSecret: keep ? outgoing : null,
        };
      });
      state = {
        status: "ok",
        secret: next.secret,
        source: "database",
        rotatedAt: next.row.rotatedAt,
        previousRevoked: next.row.previousRevoked,
        loadedOkAt: Date.now(),
        previous:
          next.previousSecret !== null && next.row.previousExpiresAt !== null
            ? {
                secret: next.previousSecret,
                fingerprint: next.row.previousFingerprint,
                expiresAt: next.row.previousExpiresAt,
              }
            : null,
      };
      loadedAt = Date.now();
      return snapshot();
    },
    async revokePrevious() {
      const written = await writeTx(async (row) => {
        const out: KeySetRow = {
          id: "blob_hmac",
          currentSealed: row?.currentSealed ?? null,
          currentFingerprint: row?.currentFingerprint ?? null,
          previousSealed: null,
          previousFingerprint: null,
          previousExpiresAt: null,
          previousRevoked: true,
          rotatedAt: row?.rotatedAt ?? null,
        };
        await saveKeySet(input.jord, out);
        return out;
      });
      state = fromRow(written, Date.now());
      loadedAt = Date.now();
      return snapshot();
    },
  };
  // Load eagerly so signing outside `/blobs/*` (which awaits ready()) has a
  // confirmed key; until then signing fails closed.
  void set.ready().catch(() => undefined);
  return set;
}
