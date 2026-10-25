import { CreateBucketCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { afterEach, describe, expect, it } from "vitest";

import { createJordApp } from "../app.js";
import type { JordAuthConfig } from "../auth/config.js";
import { signSessionToken } from "../auth/token.js";
import { createWriteQueue } from "../queue.js";
import { openTestDb, type TestDb } from "../testing/harness.js";
import { createS3ClientFromOptions, createS3StorageAdapter } from "./s3.js";

/**
 * Live S3-compatible (MinIO / R2 / AWS) test. Skipped unless
 * JORD_TEST_S3_ENDPOINT is set. Other vars:
 *   JORD_TEST_S3_BUCKET (default jord-test), JORD_TEST_S3_ACCESS_KEY_ID,
 *   JORD_TEST_S3_SECRET_ACCESS_KEY, JORD_TEST_S3_REGION (default us-east-1).
 * The bucket is created in setup if missing.
 */
const endpoint = process.env.JORD_TEST_S3_ENDPOINT?.trim();
const bucketName = process.env.JORD_TEST_S3_BUCKET?.trim() || "jord-test";
const accessKeyId = process.env.JORD_TEST_S3_ACCESS_KEY_ID?.trim();
const secretAccessKey = process.env.JORD_TEST_S3_SECRET_ACCESS_KEY?.trim();
const region = process.env.JORD_TEST_S3_REGION?.trim() || "us-east-1";

const AUTH: JordAuthConfig = {
  secret: "test-s3-live-secret",
  defaultRole: "admin",
  legacyMode: "service",
  jwtSecret: null,
  jwtSecretPrevious: null,
  jwtIss: "jord",
  jwtAud: "jord",
};

const dbs: TestDb[] = [];
afterEach(async () => {
  while (dbs.length > 0) await dbs.pop()?.close();
});

function headers(role: "admin" | "editor" = "editor") {
  return {
    Authorization: `Bearer ${signSessionToken(role, AUTH.secret)}`,
    "Content-Type": "application/json",
  };
}

describe.skipIf(!endpoint)("S3 adapter live (sign -> upload -> finalize)", () => {
  it("runs the real flow against the S3 endpoint", async () => {
    const s3opts = {
      endpoint,
      region,
      accessKeyId,
      secretAccessKey,
      forcePathStyle: true,
      physicalBucket: bucketName,
    };
    const client = createS3ClientFromOptions(s3opts);
    try {
      await client.send(new HeadBucketCommand({ Bucket: bucketName }));
    } catch {
      await client.send(new CreateBucketCommand({ Bucket: bucketName }));
    }
    const storage = createS3StorageAdapter({ ...s3opts, client });

    const db = await openTestDb("file");
    dbs.push(db);
    const app = createJordApp({
      jord: db.jord,
      enqueueWrite: createWriteQueue(),
      auth: AUTH,
      blobsRoot: "unused-blobs-root",
      blobSigningSecret: AUTH.secret,
      storage,
    });

    const key = `live-${Date.now()}.txt`;
    const enc = encodeURIComponent(key);
    const body = "s3-live-body";

    // sign
    const sign = await app.request(`/blobs/lab/objects/${enc}/sign`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        intent: "upload",
        content_type: "text/plain",
        ttl_seconds: 120,
      }),
    });
    expect(sign.status).toBe(200);
    const signed = (await sign.json()) as {
      url: string;
      method: string;
      headers: Record<string, string>;
      object: { status: string };
      storage: string;
    };
    expect(signed.storage).toBe("s3");
    expect(signed.method).toBe("PUT");
    expect(signed.object.status).toBe("pending");
    expect(signed.url.startsWith(endpoint!)).toBe(true);

    // finalize before upload must fail
    const early = await app.request(`/blobs/lab/objects/${enc}/finalize`, {
      method: "POST",
      headers: headers(),
      body: "{}",
    });
    expect(early.status).toBeGreaterThanOrEqual(400);

    // upload straight to the signed URL (what the real client does)
    const put = await fetch(signed.url, {
      method: signed.method,
      headers: signed.headers,
      body,
    });
    expect(put.status).toBe(200);

    // finalize
    const fin = await app.request(`/blobs/lab/objects/${enc}/finalize`, {
      method: "POST",
      headers: headers(),
      body: "{}",
    });
    expect(fin.status).toBe(200);
    const ready = (await fin.json()) as {
      status: string;
      size: number;
      content_type?: string;
      contentType?: string;
    };
    expect(ready.status).toBe("ready");
    expect(ready.size).toBe(body.length);

    // download via server route
    const get = await app.request(`/blobs/lab/objects/${enc}`, {
      headers: headers(),
    });
    expect(get.status).toBe(200);
    expect(await get.text()).toBe(body);

    // download via presigned GET
    const signDl = await app.request(`/blobs/lab/objects/${enc}/sign`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ intent: "download" }),
    });
    expect(signDl.status).toBe(200);
    const dl = (await signDl.json()) as { url: string };
    const direct = await fetch(dl.url);
    expect(direct.status).toBe(200);
    expect(await direct.text()).toBe(body);

    // delete
    const del = await app.request(`/blobs/lab/objects/${enc}`, {
      method: "DELETE",
      headers: headers(),
    });
    expect(del.status).toBe(200);
    expect(await storage.getObject("lab", key)).toBeNull();
    expect(await storage.headObject("lab", key)).toBeNull();
  }, 30_000);
});
