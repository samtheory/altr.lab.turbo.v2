export const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

export function resolveIdempotencyTtlMs(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const raw = env.JORD_IDEMPOTENCY_TTL_MS?.trim();
  if (!raw) return DEFAULT_TTL_MS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_TTL_MS;
  }
  return parsed;
}

type StoredEntry = {
  bodyHash: string;
  status: number;
  body: unknown;
  headers?: Record<string, string>;
  expiresAt: number;
};

export type IdempotencyLookup =
  | { kind: "miss" }
  | {
      kind: "hit";
      status: number;
      body: unknown;
      headers?: Record<string, string>;
    }
  | { kind: "conflict" };

export type IdempotencyStore = {
  lookup(
    key: string,
    principalKey: string,
    bodyHash: string,
  ): IdempotencyLookup;
  remember(
    key: string,
    principalKey: string,
    bodyHash: string,
    response: { status: number; body: unknown },
  ): void;
};

function compositeKey(key: string, principalKey: string): string {
  return `${key}\u0000${principalKey}`;
}

export function createIdempotencyStore(ttlMs: number): IdempotencyStore {
  const entries = new Map<string, StoredEntry>();

  function purgeIfExpired(entryKey: string, entry: StoredEntry): boolean {
    if (entry.expiresAt > Date.now()) return false;
    entries.delete(entryKey);
    return true;
  }

  return {
    lookup(key, principalKey, bodyHash) {
      const entryKey = compositeKey(key, principalKey);
      const entry = entries.get(entryKey);
      if (!entry) {
        return { kind: "miss" };
      }
      if (purgeIfExpired(entryKey, entry)) {
        return { kind: "miss" };
      }
      if (entry.bodyHash !== bodyHash) {
        return { kind: "conflict" };
      }
      return {
        kind: "hit",
        status: entry.status,
        body: entry.body,
        headers: entry.headers,
      };
    },

    remember(key, principalKey, bodyHash, response) {
      const entryKey = compositeKey(key, principalKey);
      entries.set(entryKey, {
        bodyHash,
        status: response.status,
        body: response.body,
        expiresAt: Date.now() + ttlMs,
      });
    },
  };
}
