import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  ensureLocalDevMasterKey,
  resolveMasterKeyPath,
  shouldAutoProvisionMasterKey,
} from "./dev-master-key.js";

const temps: string[] = [];

afterEach(async () => {
  while (temps.length > 0) {
    const dir = temps.pop();
    if (!dir) continue;
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
});

describe("ensureLocalDevMasterKey", () => {
  it("skips production unless JORD_DEV_MASTER_KEY=1", () => {
    expect(
      shouldAutoProvisionMasterKey({
        NODE_ENV: "production",
      }),
    ).toBe(false);
    expect(
      shouldAutoProvisionMasterKey({
        NODE_ENV: "production",
        JORD_DEV_MASTER_KEY: "1",
      }),
    ).toBe(true);
  });

  it("provisions and reuses a stable hex key for local dev", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "jord-master-"));
    temps.push(dir);
    const env: NodeJS.ProcessEnv = { NODE_ENV: "development" };

    const first = ensureLocalDevMasterKey(env, dir);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(env.JORD_MASTER_KEY).toBe(first);

    const onDisk = (await readFile(resolveMasterKeyPath(dir), "utf8")).trim();
    expect(onDisk).toBe(first);

    const env2: NodeJS.ProcessEnv = { NODE_ENV: "development" };
    const second = ensureLocalDevMasterKey(env2, dir);
    expect(second).toBe(first);
  });

  it("respects an already-valid JORD_MASTER_KEY", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "jord-master-"));
    temps.push(dir);
    const hex = "a".repeat(64);
    const env: NodeJS.ProcessEnv = {
      NODE_ENV: "development",
      JORD_MASTER_KEY: hex,
    };
    expect(ensureLocalDevMasterKey(env, dir)).toBe(hex);
  });
});
