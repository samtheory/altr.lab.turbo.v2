import {
  CreateBucketCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { afterEach, describe, expect, it } from "vitest";

import { createJordApp } from "../app.js";
import type { JordAuthConfig } from "../auth/config.js";
import { signSessionToken } from "../auth/token.js";
import { createWriteQueue } from "../queue.js";
import { openTestDb, type TestDb } from "../testing/harness.js";
import { createS3ClientFromOptions, createS3StorageAdapter } from "./s3.js";

/**
 * Live S3-compatible multipart test (S0081). Skipped unless
 * JORD_TEST_S3_ENDPOINT is set (same vars as s3-live.test.ts).
 */
const endpoint = process.env.JORD_TEST_S3_ENDPOINT?.trim();
const bucketName = process.env.JORD_TEST_S3_BUCKET?.trim() || "jord-test";
const accessKeyId = process.env.JORD_TEST_S3_ACCESS_KEY_ID?.trim();
const secretAccessKey = process.env.JORD_TEST_S3_SECRET_ACCESS_KEY?.trim();
const region = process.env.JORD_TEST_S3_REGION?.trim() || "us-east-1";

const AUTH: JordAuthConfig = {
  secret: "test-s3-multipart-secret",
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

const headers = {
  Authorization: `Bearer ${signSessionToken("admin", AUTH.secret)}`,
  "Content-Type": "application/json",
};

describe.skipIf(!endpoint)("S3 multipart live (create -> parts -> resume -> complete)", () => {
  it("uploads presigned parts, resumes via ListParts, and completes", async () => {
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
    const db = await openTestDb("file");
    dbs.push(db);
    const app = createJordApp({
      jord: db.jord,
      enqueueWrite: createWriteQueue(),
      auth: AUTH,
      storage: createS3StorageAdapter({ ...s3opts, client }),
      blobSigningSecret: AUTH.secret,
    });

    const partSize = 5 * 1024 * 1024;
    const key = `mp-${Date.now()}.bin`;
    const created = await app.request("/blobs/lab/uploads", {
      method: "POST",
      headers,
      body: JSON.stringify({ key, size: partSize + 3, part_size: partSize }),
    });
    expect(created.status).toBe(201);
    const { upload_id: id } = (await created.json()) as { upload_id: string };

    const sign = async (parts: number[]) =>
      (
        (await (
          await app.request(`/blobs/lab/uploads/${id}/parts/sign`, {
            method: "POST",
            headers,
            body: JSON.stringify({ parts }),
          })
        ).json()) as { parts: Array<{ url: string; method: string }> }
      ).parts;

    const [p1] = await sign([1]);
    expect((await fetch(p1!.url, { method: "PUT", body: new Uint8Array(partSize).fill(1) })).ok).toBe(true);

    const status = (await (
      await app.request(`/blobs/lab/uploads/${id}`, { headers })
    ).json()) as { missing_parts: number[]; parts: Array<{ part_number: number }> };
    expect(status.parts.map((p) => p.part_number)).toEqual([1]);
    expect(status.missing_parts).toEqual([2]);

    const [p2] = await sign([2]);
    expect((await fetch(p2!.url, { method: "PUT", body: new Uint8Array(3).fill(2) })).ok).toBe(true);

    const done = await app.request(`/blobs/lab/uploads/${id}/complete`, {
      method: "POST",
      headers,
      body: "{}",
    });
    expect(done.status).toBe(200);
    expect(await done.json()).toMatchObject({ status: "ready", size: partSize + 3 });
    await client.send(
      new DeleteObjectCommand({ Bucket: bucketName, Key: `lab/${key}` }),
    );
  }, 60_000);
});
