import { randomBytes } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { createAesGcmSecretPort } from "@altr/jord";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createJordApp } from "../app.js";
import type { JordAuthConfig } from "../auth/config.js";
import { signSessionToken } from "../auth/token.js";
import { createWriteQueue } from "../queue.js";
import {
  openTestDb,
  TEST_BACKENDS,
  type TestBackend,
  type TestDb,
} from "../testing/harness.js";
import {
  assertNoBucketSecretsInJson,
  getBucketRow,
  validateProviderConnection,
} from "./index.js";

const AUTH: JordAuthConfig = {
  secret: "test-bucket-admin-secret",
  defaultRole: "admin",
  legacyMode: "service",
  jwtSecret: null,
  jwtSecretPrevious: null,
  jwtIss: "jord",
  jwtAud: "jord",
};

const adminHeaders = {
  Authorization: `Bearer ${signSessionToken("admin", AUTH.secret)}`,
  "Content-Type": "application/json",
};

const temps: string[] = [];
const dbs: TestDb[] = [];
let backend: TestBackend = "file";

afterEach(async () => {
  while (dbs.length > 0) await dbs.pop()?.close();
  while (temps.length > 0) {
    const dir = temps.pop();
    if (dir) await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
});

describe("S0067 provider validation", () => {
  it("requires endpoint + physical for minio/compatible", () => {
    expect(
      validateProviderConnection({
        provider: "minio",
        endpoint: null,
        physical_bucket: "x",
      }),
    ).toMatch(/endpoint/i);
    expect(
      validateProviderConnection({
        provider: "s3-compatible",
        endpoint: "http://127.0.0.1:9000",
        physical_bucket: null,
      }),
    ).toMatch(/physical_bucket/i);
    expect(
      validateProviderConnection({
        provider: "minio",
        endpoint: "http://127.0.0.1:9000",
        physical_bucket: "jord",
      }),
    ).toBeNull();
  });

  it("requires region + physical for s3/r2 (endpoint for r2)", () => {
    expect(
      validateProviderConnection({
        provider: "s3",
        region: null,
        physical_bucket: "b",
      }),
    ).toMatch(/region/i);
    expect(
      validateProviderConnection({
        provider: "r2",
        region: "auto",
        physical_bucket: "b",
        endpoint: null,
      }),
    ).toMatch(/endpoint/i);
    expect(
      validateProviderConnection({
        provider: "s3",
        region: "us-east-1",
        physical_bucket: "b",
      }),
    ).toBeNull();
  });

  it("allows local with no connection fields", () => {
    expect(validateProviderConnection({ provider: "local" })).toBeNull();
  });
});

describe.each(TEST_BACKENDS)("S0067 bucket config API (%s)", (name) => {
  beforeEach(() => {
    backend = name;
  });

  async function boot(options?: {
    probeOk?: boolean;
    probeError?: string;
  }) {
    const dir = await mkdtemp(path.join(tmpdir(), "jord-bucket-admin-"));
    temps.push(dir);
    const db = await openTestDb(backend);
    dbs.push(db);
    const secrets = createAesGcmSecretPort({ masterKey: randomBytes(32) });
    const probeOk = options?.probeOk !== false;
    const app = createJordApp({
      jord: db.jord,
      enqueueWrite: createWriteQueue(),
      auth: AUTH,
      secrets,
      blobsRoot: path.join(dir, "blobs"),
      blobSigningSecret: AUTH.secret,
      runBucketProbe: async () =>
        probeOk
          ? { ok: true as const }
          : {
              ok: false as const,
              error: options?.probeError ?? "Access Denied",
            },
    });
    return { app, jord: db.jord, secrets, dir };
  }

  it("failed test saves nothing", async () => {
    const { app, jord } = await boot({
      probeOk: false,
      probeError: "InvalidAccessKeyId",
    });
    const res = await app.request("/admin/buckets", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        name: "media",
        provider: "minio",
        endpoint: "http://127.0.0.1:9000",
        physical_bucket: "jord",
        access_key: "AKIA_TEST_KEY",
        secret_key: "super-secret-value-never-echo",
      }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toMatchObject({ error: "connect_failed" });
    assertNoBucketSecretsInJson(body);
    expect(JSON.stringify(body)).not.toContain("super-secret-value-never-echo");
    expect(JSON.stringify(body)).not.toContain("AKIA_TEST_KEY");
    expect(await getBucketRow(jord, "media")).toBeNull();
  });

  it("create stores sealed creds and never returns them", async () => {
    const { app, jord, secrets } = await boot({ probeOk: true });
    const res = await app.request("/admin/buckets", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        name: "assets",
        provider: "s3",
        region: "us-east-1",
        physical_bucket: "jord-assets",
        access_key: "AKIAEXAMPLE1234",
        secret_key: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    assertNoBucketSecretsInJson(body);
    expect(body.bucket).toMatchObject({
      name: "assets",
      provider: "s3",
      configured: true,
      access_key_prefix: "AKIA",
      access_key_last4: "1234",
      status: "active",
    });
    expect(JSON.stringify(body)).not.toContain(
      "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    );

    const row = await getBucketRow(jord, "assets");
    expect(row?.accessKeySealed).toBeTruthy();
    expect(row?.secretKeySealed).toBeTruthy();
    expect(secrets.unseal(row!.accessKeySealed!)).toBe("AKIAEXAMPLE1234");

    const list = await app.request("/admin/buckets", { headers: adminHeaders });
    expect(list.status).toBe(200);
    const listed = await list.json();
    assertNoBucketSecretsInJson(listed);
    expect(listed.buckets).toHaveLength(1);
  });

  it("POST /test failure does not create a row", async () => {
    const { app, jord } = await boot({
      probeOk: false,
      probeError: "NoSuchBucket",
    });
    const res = await app.request("/admin/buckets/staging/test", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        provider: "minio",
        endpoint: "http://127.0.0.1:9000",
        physical_bucket: "jord",
        access_key: "minio",
        secret_key: "minio123",
      }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    assertNoBucketSecretsInJson(body);
    expect(await getBucketRow(jord, "staging")).toBeNull();
  });

  it("rotation invalidates old sealed credentials", async () => {
    const { app, jord, secrets } = await boot({ probeOk: true });
    const created = await app.request("/admin/buckets", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        name: "rotate-me",
        provider: "minio",
        endpoint: "http://127.0.0.1:9000",
        physical_bucket: "jord",
        force_path_style: true,
        access_key: "OLDACCESSKEY01",
        secret_key: "old-secret-value-aaaaaaaa",
      }),
    });
    expect(created.status).toBe(201);
    const before = await getBucketRow(jord, "rotate-me");
    const oldAccess = before!.accessKeySealed!;
    const oldSecret = before!.secretKeySealed!;
    expect(secrets.unseal(oldAccess)).toBe("OLDACCESSKEY01");

    const rotated = await app.request("/admin/buckets/rotate-me/rotate", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        access_key: "NEWACCESSKEY99",
        secret_key: "new-secret-value-bbbbbbbb",
      }),
    });
    expect(rotated.status).toBe(200);
    const rotatedBody = await rotated.json();
    assertNoBucketSecretsInJson(rotatedBody);
    expect(rotatedBody.bucket.access_key_last4).toBe("EY99");
    expect(JSON.stringify(rotatedBody)).not.toContain("new-secret-value");

    expect(() => secrets.unseal(oldAccess)).toThrow(/rotated/i);
    expect(() => secrets.unseal(oldSecret)).toThrow(/rotated/i);

    const after = await getBucketRow(jord, "rotate-me");
    expect(secrets.unseal(after!.accessKeySealed!)).toBe("NEWACCESSKEY99");
    expect(secrets.unseal(after!.secretKeySealed!)).toBe(
      "new-secret-value-bbbbbbbb",
    );
  });

  it("failed rotation keeps previous credentials", async () => {
    const { app, jord, secrets } = await boot({ probeOk: true });
    await app.request("/admin/buckets", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        name: "keep-old",
        provider: "s3",
        region: "eu-west-1",
        physical_bucket: "jord",
        access_key: "KEEPOLDKEY0001",
        secret_key: "keep-old-secret-cccccccc",
      }),
    });
    const before = await getBucketRow(jord, "keep-old");

    // Rebuild app with failing probe for rotate only.
    const failApp = createJordApp({
      jord,
      enqueueWrite: createWriteQueue(),
      auth: AUTH,
      secrets,
      blobsRoot: path.join(temps[temps.length - 1]!, "blobs"),
      blobSigningSecret: AUTH.secret,
      runBucketProbe: async () => ({
        ok: false as const,
        error: "signature mismatch",
      }),
    });
    const res = await failApp.request("/admin/buckets/keep-old/rotate", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        access_key: "BADKEY",
        secret_key: "bad-secret",
      }),
    });
    expect(res.status).toBe(400);
    const after = await getBucketRow(jord, "keep-old");
    expect(after?.accessKeySealed).toBe(before?.accessKeySealed);
    expect(secrets.unseal(after!.accessKeySealed!)).toBe("KEEPOLDKEY0001");
  });

  it("pause and resume flip status", async () => {
    const { app } = await boot({ probeOk: true });
    await app.request("/admin/buckets", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        name: "local-one",
        provider: "local",
      }),
    });
    const paused = await app.request("/admin/buckets/local-one/pause", {
      method: "POST",
      headers: adminHeaders,
    });
    expect(paused.status).toBe(200);
    const pausedBody = await paused.json();
    expect(pausedBody.bucket.status).toBe("paused");
    assertNoBucketSecretsInJson(pausedBody);

    const resumed = await app.request("/admin/buckets/local-one/resume", {
      method: "POST",
      headers: adminHeaders,
    });
    expect(resumed.status).toBe(200);
    const body = await resumed.json();
    expect(body.bucket.status).toBe("active");
    assertNoBucketSecretsInJson(body);
  });

  it("rejects non-admin on /admin/buckets", async () => {
    const { app } = await boot();
    const res = await app.request("/admin/buckets", {
      headers: {
        Authorization: `Bearer ${signSessionToken("editor", AUTH.secret)}`,
      },
    });
    expect(res.status).toBe(403);
  });
});
