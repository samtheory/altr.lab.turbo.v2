import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

import { createJordClient, fsPathToFileUrl } from "@altr/jord";
import { afterEach, describe, expect, it } from "vitest";

import { createJordApp } from "../app.js";
import type { JordAuthConfig } from "../auth/config.js";
import { signSessionToken } from "../auth/token.js";
import { createWriteQueue } from "../queue.js";

const temps: string[] = [];
const AUTH: JordAuthConfig = {
  secret: "test-jord-server-token",
  defaultRole: "admin",
  legacyMode: "service",
  jwtSecret: "jwt-current-secret",
  jwtSecretPrevious: null,
  jwtIss: "jord",
  jwtAud: "jord",
};

afterEach(async () => {
  while (temps.length > 0) {
    const dir = temps.pop();
    if (dir) await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
});

describe("S0024 sql console", () => {
  it("enforces read-only at the engine and keeps reads off the write queue", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "jord-s0024-"));
    temps.push(dir);
    const jord = await createJordClient({
      url: fsPathToFileUrl(path.join(dir, "jord.db")),
    });
    let writes = 0;
    const base = createWriteQueue();
    const enqueueWrite = Object.assign(
      <T,>(task: () => Promise<T>) => {
        writes += 1;
        return base(task);
      },
      { drain: () => base.drain(), pending: () => base.pending() },
    );
    const app = createJordApp({
      jord,
      enqueueWrite,
      auth: AUTH,
    });
    const admin = {
      authorization: `Bearer ${signSessionToken("admin", AUTH.secret)}`,
      "content-type": "application/json",
    };
    try {
      const denied = await app.request("/sql/execute", {
        method: "POST",
        headers: admin,
        body: JSON.stringify({
          sql: "INSERT INTO records (id, bucket, body, version, created_at, updated_at) VALUES ('z','lab','{}',1,1,1)",
          readOnly: true,
        }),
      });
      expect(denied.status).toBe(400);
      expect(writes).toBe(0);

      const ok = await app.request("/sql/execute", {
        method: "POST",
        headers: admin,
        body: JSON.stringify({ sql: "SELECT 1 AS n", readOnly: true }),
      });
      expect(ok.status).toBe(200);
      expect(writes).toBe(0);
      const body = (await ok.json()) as { rows: Array<{ n: number }> };
      expect(body.rows[0]?.n).toBe(1);

      const write = await app.request("/sql/execute", {
        method: "POST",
        headers: admin,
        body: JSON.stringify({
          sql: "INSERT INTO records (id, bucket, body, version, created_at, updated_at) VALUES ('z','lab','{}',1,1,1)",
          readOnly: false,
        }),
      });
      expect(write.status).toBe(200);
      expect(writes).toBe(1);
    } finally {
      await jord.close();
    }
  });
});
