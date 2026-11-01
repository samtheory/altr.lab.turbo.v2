import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/** Opaque sealed envelope format version. */
export const SECRET_ENVELOPE_VERSION = 1;

export type SecretPort = {
  putSecret(id: string, plaintext: string): Promise<void>;
  getSecret(id: string): Promise<string>;
  /**
   * Replace plaintext for `id`. Prior sealed envelopes for this id are
   * rejected by {@link unseal} / {@link getSecret}.
   */
  rotate(id: string, newPlaintext: string): Promise<void>;
  /** Decrypt a sealed envelope; fails if rotated away or tampered. */
  unseal(sealed: string): string;
};

export class JordMasterKeyError extends Error {
  readonly code = "jord_master_key" as const;

  constructor(message: string) {
    super(message);
    this.name = "JordMasterKeyError";
  }
}

export class JordSecretError extends Error {
  readonly code = "jord_secret" as const;

  constructor(message: string) {
    super(message);
    this.name = "JordSecretError";
  }
}

type Envelope = {
  v: number;
  g: number;
  n: string;
  c: string;
};

const AES_ALGO = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;

/**
 * Parse `JORD_MASTER_KEY` as 32 raw bytes: 64-char hex or base64 of 32 bytes.
 * Throws {@link JordMasterKeyError} when missing or invalid.
 */
export function parseMasterKey(raw: string | undefined | null): Buffer {
  const value = raw?.trim() ?? "";
  if (!value) {
    throw new JordMasterKeyError(
      "JORD_MASTER_KEY is required for the control-plane secret port",
    );
  }
  if (/^[0-9a-fA-F]{64}$/.test(value)) {
    return Buffer.from(value, "hex");
  }
  try {
    const b64 = Buffer.from(value, "base64");
    if (b64.length === KEY_BYTES) return b64;
  } catch {
    // fall through
  }
  throw new JordMasterKeyError(
    "JORD_MASTER_KEY must be 32 bytes as 64-char hex or base64",
  );
}

function sealWithKey(
  key: Buffer,
  plaintext: string,
  generation: number,
): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(AES_ALGO, key, iv);
  const body = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  const envelope: Envelope = {
    v: SECRET_ENVELOPE_VERSION,
    g: generation,
    n: iv.toString("base64"),
    c: Buffer.concat([body, tag]).toString("base64"),
  };
  return JSON.stringify(envelope);
}

function parseEnvelope(sealed: string): Envelope {
  let parsed: unknown;
  try {
    parsed = JSON.parse(sealed) as unknown;
  } catch {
    throw new JordSecretError("sealed secret is not valid JSON");
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    typeof (parsed as Envelope).v !== "number" ||
    typeof (parsed as Envelope).g !== "number" ||
    typeof (parsed as Envelope).n !== "string" ||
    typeof (parsed as Envelope).c !== "string"
  ) {
    throw new JordSecretError("sealed secret envelope is malformed");
  }
  return parsed as Envelope;
}

function openWithKey(key: Buffer, sealed: string): string {
  const envelope = parseEnvelope(sealed);
  if (envelope.v !== SECRET_ENVELOPE_VERSION) {
    throw new JordSecretError(
      `unsupported secret envelope version ${envelope.v}`,
    );
  }
  const iv = Buffer.from(envelope.n, "base64");
  const packed = Buffer.from(envelope.c, "base64");
  if (iv.length !== IV_BYTES || packed.length <= TAG_BYTES) {
    throw new JordSecretError("sealed secret ciphertext is truncated");
  }
  const tag = packed.subarray(packed.length - TAG_BYTES);
  const data = packed.subarray(0, packed.length - TAG_BYTES);
  const decipher = createDecipheriv(AES_ALGO, key, iv);
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      "utf8",
    );
  } catch {
    throw new JordSecretError("sealed secret failed authentication");
  }
}

export type AesGcmSecretPortOptions = {
  masterKey: Buffer;
};

export type AesGcmSecretPort = SecretPort & {
  /** Current sealed envelope for an id (tests / S0043 persistence). */
  peekSealed(id: string): string | undefined;
};

/**
 * AES-256-GCM secret port (S0042). In-memory map for sealed blobs; durable
 * columns land in S0043. Rotate revokes the previous envelope string.
 */
export function createAesGcmSecretPort(
  options: AesGcmSecretPortOptions,
): AesGcmSecretPort {
  if (options.masterKey.length !== KEY_BYTES) {
    throw new JordMasterKeyError("master key must be exactly 32 bytes");
  }
  const key = Buffer.from(options.masterKey);
  const store = new Map<string, string>();
  const generation = new Map<string, number>();
  const revoked = new Set<string>();

  function requireId(id: string): string {
    const trimmed = id.trim();
    if (!trimmed) throw new JordSecretError("secret id is required");
    return trimmed;
  }

  const port: AesGcmSecretPort = {
    async putSecret(id, plaintext) {
      const keyId = requireId(id);
      if (store.has(keyId)) {
        throw new JordSecretError(`secret already exists: ${keyId}`);
      }
      const g = 1;
      store.set(keyId, sealWithKey(key, plaintext, g));
      generation.set(keyId, g);
    },

    async getSecret(id) {
      const keyId = requireId(id);
      const sealed = store.get(keyId);
      if (!sealed) throw new JordSecretError(`secret not found: ${keyId}`);
      return port.unseal(sealed);
    },

    async rotate(id, newPlaintext) {
      const keyId = requireId(id);
      const previous = store.get(keyId);
      if (!previous) {
        throw new JordSecretError(`secret not found: ${keyId}`);
      }
      revoked.add(previous);
      const next = (generation.get(keyId) ?? 0) + 1;
      store.set(keyId, sealWithKey(key, newPlaintext, next));
      generation.set(keyId, next);
    },

    unseal(sealed) {
      if (revoked.has(sealed)) {
        throw new JordSecretError("sealed secret was rotated away");
      }
      return openWithKey(key, sealed);
    },

    peekSealed(id) {
      return store.get(id);
    },
  };

  return port;
}

/**
 * Build a secret port from process env. Throws when `JORD_MASTER_KEY` is
 * missing or invalid — callers that want optional secrets must check env first.
 */
export function createSecretPortFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): SecretPort {
  return createAesGcmSecretPort({
    masterKey: parseMasterKey(env.JORD_MASTER_KEY),
  });
}

/** True when `JORD_MASTER_KEY` is set and parses as 32 bytes. */
export function hasUsableMasterKey(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  try {
    parseMasterKey(env.JORD_MASTER_KEY);
    return true;
  } catch {
    return false;
  }
}
