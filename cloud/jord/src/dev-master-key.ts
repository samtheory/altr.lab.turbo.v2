/**
 * Local-dev helper (S0043 DX): when `JORD_MASTER_KEY` is unset, persist a
 * stable 32-byte key under `data/jord-master.key` so the project registry
 * works for `pnpm dev` without manual env setup.
 *
 * Never auto-provisions in production unless `JORD_DEV_MASTER_KEY=1`.
 */

import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { hasUsableMasterKey } from "@altr/jord";

const KEY_FILE = "data/jord-master.key";
const HEX_RE = /^[0-9a-fA-F]{64}$/;

export function resolveMasterKeyPath(cwd: string = process.cwd()): string {
  return resolve(cwd, KEY_FILE);
}

export function shouldAutoProvisionMasterKey(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (hasUsableMasterKey(env)) return false;
  if (env.JORD_DEV_MASTER_KEY === "0" || env.JORD_DEV_MASTER_KEY === "false") {
    return false;
  }
  if (env.JORD_DEV_MASTER_KEY === "1" || env.JORD_DEV_MASTER_KEY === "true") {
    return true;
  }
  const nodeEnv = env.NODE_ENV?.trim().toLowerCase() ?? "";
  return nodeEnv !== "production";
}

/**
 * Ensure `process.env.JORD_MASTER_KEY` is set for local Studio project registry.
 * Returns the hex key when provisioned or already present; null when skipped.
 */
export function ensureLocalDevMasterKey(
  env: NodeJS.ProcessEnv = process.env,
  cwd: string = process.cwd(),
): string | null {
  if (hasUsableMasterKey(env)) {
    return env.JORD_MASTER_KEY!.trim();
  }
  if (!shouldAutoProvisionMasterKey(env)) {
    return null;
  }

  const path = resolveMasterKeyPath(cwd);
  let hex: string | null = null;
  if (existsSync(path)) {
    const raw = readFileSync(path, "utf8").trim();
    if (HEX_RE.test(raw)) hex = raw.toLowerCase();
  }
  if (!hex) {
    hex = randomBytes(32).toString("hex");
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${hex}\n`, { encoding: "utf8", mode: 0o600 });
  }
  env.JORD_MASTER_KEY = hex;
  return hex;
}
