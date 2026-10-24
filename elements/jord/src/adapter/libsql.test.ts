import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createJordClient } from "../client.js";
import { JordUnsupportedError, JordUrlError } from "../errors.js";
import { makeTempDir, rmTempDir } from "../test-temp.js";
import {
  fsPathToFileUrl,
  resolveDatabaseUrl,
  resolveLibsqlAuthToken,
} from "../url.js";

const temps: string[] = [];

afterEach(async () => {
  while (temps.length > 0) {
    const dir = temps.pop();
    if (dir) await rmTempDir(dir);
  }
});

async function tempFileUrl(name = "jord.db"): Promise<string> {
  const dir = await makeTempDir("jord-");
  temps.push(dir);
  return fsPathToFileUrl(path.join(dir, name));
}

describe("createJordClient / LibSqlAdapter", () => {
  it("creates missing parent directory and opens file:", async () => {
    const parent = await makeTempDir("jord-parent-");
    temps.push(parent);
    const nested = path.join(parent, "missing", "data", "jord.db");
    const url = fsPathToFileUrl(nested);

    const jord = await createJordClient({ url });
    try {
      expect(jord.dialect).toBe("libsql");
      if (!jord.client) throw new Error("expected libsql client");
      const mode = await jord.client.execute("PRAGMA journal_mode");
      const busy = await jord.client.execute("PRAGMA busy_timeout");
      const sync = await jord.client.execute("PRAGMA synchronous");

      expect(String(mode.rows[0]?.[0] ?? mode.rows[0]?.journal_mode).toLowerCase()).toBe(
        "wal",
      );
      expect(Number(busy.rows[0]?.[0] ?? busy.rows[0]?.busy_timeout)).toBe(5000);
      // SQLite: NORMAL = 1
      expect(Number(sync.rows[0]?.[0] ?? sync.rows[0]?.synchronous)).toBe(1);
    } finally {
      await jord.close();
    }
  });

  it("accepts postgres: and postgresql: at resolve time", () => {
    expect(resolveDatabaseUrl("postgres://localhost/jord")).toEqual({
      scheme: "postgres",
      url: "postgres://localhost/jord",
    });
    expect(resolveDatabaseUrl("postgresql://localhost/jord")).toEqual({
      scheme: "postgres",
      url: "postgresql://localhost/jord",
    });
  });

  it("accepts libsql: at resolve time", () => {
    expect(resolveDatabaseUrl("libsql://example.turso.io")).toEqual({
      scheme: "libsql",
      url: "libsql://example.turso.io",
    });
  });

  it("rejects libsql: without auth token", async () => {
    const prevLib = process.env.LIBSQL_AUTH_TOKEN;
    const prevTurso = process.env.TURSO_AUTH_TOKEN;
    delete process.env.LIBSQL_AUTH_TOKEN;
    delete process.env.TURSO_AUTH_TOKEN;
    try {
      await expect(
        createJordClient({ url: "libsql://example.turso.io" }),
      ).rejects.toBeInstanceOf(JordUrlError);
      await expect(
        createJordClient({ url: "libsql://example.turso.io" }),
      ).rejects.toThrow(/LIBSQL_AUTH_TOKEN/i);
    } finally {
      if (prevLib === undefined) delete process.env.LIBSQL_AUTH_TOKEN;
      else process.env.LIBSQL_AUTH_TOKEN = prevLib;
      if (prevTurso === undefined) delete process.env.TURSO_AUTH_TOKEN;
      else process.env.TURSO_AUTH_TOKEN = prevTurso;
    }
  });

  it("resolveLibsqlAuthToken prefers LIBSQL_AUTH_TOKEN", () => {
    expect(
      resolveLibsqlAuthToken({
        LIBSQL_AUTH_TOKEN: " primary ",
        TURSO_AUTH_TOKEN: "alias",
      }),
    ).toBe("primary");
    expect(
      resolveLibsqlAuthToken({
        TURSO_AUTH_TOKEN: " alias ",
      }),
    ).toBe("alias");
    expect(resolveLibsqlAuthToken({})).toBeUndefined();
  });

  it("opens a clean temp file: URL", async () => {
    const url = await tempFileUrl();
    const jord = await createJordClient({ url });
    expect(jord.dialect).toBe("libsql");
    expect(jord.urlScheme).toBe("file");
    await jord.close();
  });
});

const liveLibsqlUrl = process.env.JORD_TEST_LIBSQL_URL?.trim();
const liveLibsqlToken =
  process.env.LIBSQL_AUTH_TOKEN?.trim() ||
  process.env.TURSO_AUTH_TOKEN?.trim() ||
  process.env.JORD_TEST_LIBSQL_TOKEN?.trim();

describe.runIf(Boolean(liveLibsqlUrl && liveLibsqlToken))(
  "LibSqlAdapter hosted live",
  () => {
    it("opens, inserts, and skips snapshot on libsql://", async () => {
      const jord = await createJordClient({
        url: liveLibsqlUrl,
        authToken: liveLibsqlToken,
      });
      try {
        expect(jord.dialect).toBe("libsql");
        expect(jord.urlScheme).toBe("libsql");
        const inserted = await jord.insertRecord({
          bucket: "lab-s0019",
          body: JSON.stringify({ n: 1 }),
        });
        expect(inserted.version).toBe(1);
        await expect(
          jord.snapshotTo("/tmp/jord-libsql-snap.db"),
        ).rejects.toBeInstanceOf(JordUnsupportedError);
        await jord.checkpointTruncate();
      } finally {
        await jord.close();
      }
    });
  },
);
