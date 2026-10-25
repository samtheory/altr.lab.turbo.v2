import path from "node:path";
import { randomUUID } from "node:crypto";

import { afterEach, describe, expect, it } from "vitest";

import { makeTempDir, rmTempDir } from "../test-temp.js";
import { fsPathToFileUrl } from "../url.js";
import {
  LibSqlAdapter,
  openLibSqlWithInteractiveTxForTests,
} from "./libsql.js";

const temps: string[] = [];

afterEach(async () => {
  while (temps.length > 0) {
    const dir = temps.pop();
    if (dir) await rmTempDir(dir);
  }
});

async function tempFileUrl(): Promise<string> {
  const dir = await makeTempDir("jord-tx-");
  temps.push(dir);
  return fsPathToFileUrl(path.join(dir, "jord.db"));
}

class Boom extends Error {}

/** Per-run bucket prefix so live CI runs on a shared db never touch each other's rows. */
const runPrefix = `tx-${randomUUID().slice(0, 8)}-`;

/** Escape LIKE wildcards and the escape char itself, then append the trailing `%`. */
function likePrefixPattern(prefix: string): string {
  return `${prefix.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

async function rawInsert(jord: LibSqlAdapter, bucket: string): Promise<string> {
  const id = randomUUID();
  const now = Date.now();
  await jord.query(
    `INSERT INTO records (id, bucket, body, created_at, updated_at, version)
     VALUES (?, ?, ?, ?, ?, 1)`,
    [id, bucket, "{}", now, now],
  );
  return id;
}

async function bucketCount(jord: LibSqlAdapter, bucket: string): Promise<number> {
  const rows = await jord.query(
    "SELECT COUNT(*) AS n FROM records WHERE bucket = ?",
    [bucket],
  );
  return Number(rows[0]?.n ?? 0);
}

/**
 * Drizzle insert (insertRecord) + raw `query` insert + raw `client.execute`
 * update (updateRecord) inside one transaction. Throw → none land.
 */
async function expectRollbackOnThrow(
  jord: LibSqlAdapter,
  prefix = "tx-",
): Promise<void> {
  const bucket = `${prefix}rb-${randomUUID()}`;
  const seed = await jord.insertRecord({ bucket: `${bucket}-seed`, body: "{}" });

  await expect(
    jord.transaction(async () => {
      await jord.insertRecord({ bucket, body: "{}" });
      await rawInsert(jord, bucket);
      const updated = await jord.updateRecord({
        id: seed.id,
        version: seed.version,
        body: '{"changed":true}',
      });
      expect(updated.ok).toBe(true);
      // Reads inside work see the uncommitted writes (same transaction).
      expect(await bucketCount(jord, bucket)).toBe(2);
      throw new Boom("rollback");
    }),
  ).rejects.toBeInstanceOf(Boom);

  expect(await bucketCount(jord, bucket)).toBe(0);
  const after = await jord.getRecord(seed.id);
  expect(after?.version).toBe(1);
  expect(after?.body).toBe("{}");
}

async function expectCommitOnSuccess(
  jord: LibSqlAdapter,
  prefix = "tx-",
): Promise<void> {
  const bucket = `${prefix}ok-${randomUUID()}`;
  const result = await jord.transaction(async () => {
    const rec = await jord.insertRecord({ bucket, body: "{}" });
    const rawId = await rawInsert(jord, bucket);
    return { recId: rec.id, rawId };
  });
  expect(await bucketCount(jord, bucket)).toBe(2);
  expect(await jord.getRecord(result.recId)).not.toBeNull();
  expect(await jord.getRecord(result.rawId)).not.toBeNull();
}

async function expectNestedJoinsOuter(
  jord: LibSqlAdapter,
  prefix = "tx-",
): Promise<void> {
  const bucket = `${prefix}nest-${randomUUID()}`;
  await expect(
    jord.transaction(async () => {
      await jord.insertRecord({ bucket, body: "{}" });
      // Inner call joins the outer one: its commit is the outer commit.
      await jord.transaction(async () => {
        await rawInsert(jord, bucket);
      });
      expect(await bucketCount(jord, bucket)).toBe(2);
      throw new Boom("outer rollback");
    }),
  ).rejects.toBeInstanceOf(Boom);
  expect(await bucketCount(jord, bucket)).toBe(0);

  await jord.transaction(async () => {
    await jord.insertRecord({ bucket, body: "{}" });
    await jord.transaction(async () => {
      await rawInsert(jord, bucket);
    });
  });
  expect(await bucketCount(jord, bucket)).toBe(2);
}

describe("LibSqlAdapter.transaction — hosted (interactive) path on file:", () => {
  it("rolls back drizzle + raw writes when work throws", async () => {
    const jord = await openLibSqlWithInteractiveTxForTests(await tempFileUrl());
    try {
      await expectRollbackOnThrow(jord);
    } finally {
      await jord.close();
    }
  });

  it("commits drizzle + raw writes when work succeeds", async () => {
    const jord = await openLibSqlWithInteractiveTxForTests(await tempFileUrl());
    try {
      await expectCommitOnSuccess(jord);
    } finally {
      await jord.close();
    }
  });

  it("nested transaction joins the outer one", async () => {
    const jord = await openLibSqlWithInteractiveTxForTests(await tempFileUrl());
    try {
      await expectNestedJoinsOuter(jord);
    } finally {
      await jord.close();
    }
  });
});

describe("LibSqlAdapter.transaction — file (shared connection) path", () => {
  it("rolls back, commits, and nests the same way", async () => {
    const jord = await LibSqlAdapter.open(await tempFileUrl());
    try {
      await expectRollbackOnThrow(jord);
      await expectCommitOnSuccess(jord);
      await expectNestedJoinsOuter(jord);
    } finally {
      await jord.close();
    }
  });
});

const liveLibsqlUrl = process.env.JORD_TEST_LIBSQL_URL?.trim();
const liveLibsqlToken = process.env.JORD_TEST_LIBSQL_AUTH_TOKEN?.trim();

describe.runIf(Boolean(liveLibsqlUrl && liveLibsqlToken))(
  "LibSqlAdapter.transaction — live hosted libsql://",
  () => {
    it("is atomic: rollback, commit, nested join", async () => {
      const jord = await LibSqlAdapter.open(liveLibsqlUrl!, {
        authToken: liveLibsqlToken!,
      });
      try {
        expect(jord.urlScheme).toBe("libsql");
        await expectRollbackOnThrow(jord, runPrefix);
        await expectCommitOnSuccess(jord, runPrefix);
        await expectNestedJoinsOuter(jord, runPrefix);
      } finally {
        try {
          await jord.query(
            "DELETE FROM records WHERE bucket LIKE ? ESCAPE '\\'",
            [likePrefixPattern(runPrefix)],
          );
        } finally {
          await jord.close();
        }
      }
    }, 60_000);
  },
);
