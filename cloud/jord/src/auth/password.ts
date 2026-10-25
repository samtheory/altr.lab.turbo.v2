import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

function scryptAsync(
  password: string,
  salt: string,
  keylen: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (err, derived) => {
      if (err) reject(err);
      else resolve(derived);
    });
  });
}

/** Explicit scrypt parameters stored in the hash string. */
export const SCRYPT_N = 16384;
export const SCRYPT_R = 8;
export const SCRYPT_P = 1;
export const SCRYPT_MAXMEM = 64 * 1024 * 1024;
const KEYLEN = 32;

const MIN_PASSWORD = 10;

export function passwordPolicyError(
  password: string,
  email: string,
): string | null {
  if (password.length < MIN_PASSWORD) {
    return "password must be at least 10 characters";
  }
  if (password.toLowerCase() === email.trim().toLowerCase()) {
    return "password must not equal the email";
  }
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("base64url");
  const derived = (await scryptAsync(password, salt, KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: SCRYPT_MAXMEM,
  })) as Buffer;
  return [
    "scrypt",
    String(SCRYPT_N),
    String(SCRYPT_R),
    String(SCRYPT_P),
    String(SCRYPT_MAXMEM),
    salt,
    derived.toString("base64url"),
  ].join("$");
}

let dummyHash: Promise<string> | null = null;

/** Stable cost so unknown-email sign-in still runs scrypt. */
export function dummyPasswordHash(): Promise<string> {
  dummyHash ??= hashPassword("jord-dummy-password-not-a-user");
  return dummyHash;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 7 || parts[0] !== "scrypt") return false;
  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const maxmem = Number(parts[4]);
  const salt = parts[5] ?? "";
  const expected = Buffer.from(parts[6] ?? "", "base64url");
  if (
    !Number.isFinite(n) ||
    !Number.isFinite(r) ||
    !Number.isFinite(p) ||
    !Number.isFinite(maxmem) ||
    expected.length === 0
  ) {
    return false;
  }
  const derived = (await scryptAsync(password, salt, expected.length, {
    N: n,
    r,
    p,
    maxmem,
  })) as Buffer;
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}
