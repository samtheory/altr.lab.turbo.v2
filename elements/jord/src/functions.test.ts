import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createJordClient } from "./client.js";
import { makeTempDir, rmTempDir } from "./test-temp.js";
import { fsPathToFileUrl } from "./url.js";

const temps: string[] = [];

afterEach(async () => {
  while (temps.length > 0) {
    const dir = temps.pop();
    if (dir) await rmTempDir(dir);
  }
});

async function openTemp() {
  const dir = await makeTempDir("jord-functions-");
  temps.push(dir);
  return createJordClient({
    url: fsPathToFileUrl(path.join(dir, "jord.db")),
  });
}

describe("jord functions + custom apis schema", () => {
  it("round-trips function and custom api; blocks delete with dependents", async () => {
    const jord = await openTemp();
    try {
      const fn = await jord.insertFunction({
        name: "Echo lab",
        slug: "echo-lab",
        steps: JSON.stringify([{ kind: "echo", config: { message: "hi" } }]),
      });
      expect(fn.slug).toBe("echo-lab");
      expect(await jord.getFunctionBySlug("echo-lab")).toEqual(fn);

      const api = await jord.insertCustomApi({
        name: "Echo GET",
        method: "GET",
        slug: "echo",
        functionId: fn.id,
      });
      expect(api.functionId).toBe(fn.id);
      expect(await jord.getCustomApiByMethodSlug("GET", "echo")).toEqual(api);

      const blocked = await jord.deleteFunction(fn.id);
      expect(blocked).toEqual({
        ok: false,
        error: "has_dependents",
        dependents: 1,
      });

      expect(await jord.deleteCustomApi(api.id)).toBe(true);
      expect(await jord.deleteFunction(fn.id)).toEqual({ ok: true });
      expect(await jord.getFunction(fn.id)).toBeNull();
    } finally {
      await jord.close();
    }
  });
});
