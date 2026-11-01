import { randomBytes } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  createAesGcmSecretPort,
  createSecretPortFromEnv,
  hasUsableMasterKey,
  JordMasterKeyError,
  JordSecretError,
  parseMasterKey,
} from "./secret-port.js";

describe("parseMasterKey", () => {
  it("accepts 64-char hex", () => {
    const hex = randomBytes(32).toString("hex");
    expect(parseMasterKey(hex)).toHaveLength(32);
  });

  it("accepts base64 of 32 bytes", () => {
    const key = randomBytes(32);
    expect(parseMasterKey(key.toString("base64")).equals(key)).toBe(true);
  });

  it("fails loudly when missing", () => {
    expect(() => parseMasterKey(undefined)).toThrow(JordMasterKeyError);
    expect(() => parseMasterKey("")).toThrow(/JORD_MASTER_KEY is required/);
  });

  it("rejects short keys", () => {
    expect(() => parseMasterKey("deadbeef")).toThrow(JordMasterKeyError);
  });
});

describe("createAesGcmSecretPort", () => {
  it("encrypt → decrypt → rotate → old value rejected", async () => {
    const port = createAesGcmSecretPort({ masterKey: randomBytes(32) });

    await port.putSecret("db-password", "s3cret-one");
    expect(await port.getSecret("db-password")).toBe("s3cret-one");

    const oldSealed = port.peekSealed("db-password");
    expect(oldSealed).toBeTruthy();
    expect(port.unseal(oldSealed!)).toBe("s3cret-one");

    await port.rotate("db-password", "s3cret-two");
    expect(await port.getSecret("db-password")).toBe("s3cret-two");

    expect(() => port.unseal(oldSealed!)).toThrow(JordSecretError);
    expect(() => port.unseal(oldSealed!)).toThrow(/rotated away/);
  });

  it("rejects put on an existing id", async () => {
    const port = createAesGcmSecretPort({ masterKey: randomBytes(32) });
    await port.putSecret("a", "1");
    await expect(port.putSecret("a", "2")).rejects.toThrow(/already exists/);
  });

  it("rejects tampered ciphertext", async () => {
    const port = createAesGcmSecretPort({ masterKey: randomBytes(32) });
    await port.putSecret("x", "plain");
    const sealed = port.peekSealed("x")!;
    const parsed = JSON.parse(sealed) as { c: string };
    parsed.c = Buffer.from("tampered-bytes-!!!!!!!").toString("base64");
    expect(() => port.unseal(JSON.stringify(parsed))).toThrow(JordSecretError);
  });
});

describe("createSecretPortFromEnv", () => {
  it("builds from JORD_MASTER_KEY hex", async () => {
    const hex = randomBytes(32).toString("hex");
    const port = createSecretPortFromEnv({ JORD_MASTER_KEY: hex });
    await port.putSecret("k", "v");
    expect(await port.getSecret("k")).toBe("v");
  });

  it("hasUsableMasterKey mirrors parse success", () => {
    expect(hasUsableMasterKey({})).toBe(false);
    expect(
      hasUsableMasterKey({ JORD_MASTER_KEY: randomBytes(32).toString("hex") }),
    ).toBe(true);
  });
});
