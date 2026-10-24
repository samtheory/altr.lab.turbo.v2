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
  const dir = await makeTempDir("jord-policies-");
  temps.push(dir);
  return createJordClient({
    url: fsPathToFileUrl(path.join(dir, "jord.db")),
  });
}

describe("jord policies + triggers schema", () => {
  it("round-trips policy and trigger; listFor filters enabled", async () => {
    const jord = await openTemp();
    try {
      const policy = await jord.insertPolicy({
        name: "Deny readonly select",
        tableName: "records",
        operation: "select",
        effect: "deny",
        rules: JSON.stringify([
          { kind: "role_in", config: { roles: ["readonly"] } },
        ]),
        priority: 10,
      });
      expect(policy.tableName).toBe("records");
      expect(await jord.getPolicy(policy.id)).toEqual(policy);

      const disabled = await jord.insertPolicy({
        name: "Off",
        tableName: "records",
        operation: "select",
        effect: "allow",
        rules: JSON.stringify([{ kind: "always", config: {} }]),
        enabled: false,
        priority: 100,
      });

      const forSelect = await jord.listPoliciesFor("records", "select");
      expect(forSelect.map((p) => p.id)).toEqual([policy.id]);
      expect(forSelect.find((p) => p.id === disabled.id)).toBeUndefined();

      const updated = await jord.updatePolicy({
        id: policy.id,
        priority: 20,
        rules: JSON.stringify([{ kind: "always", config: {} }]),
      });
      expect(updated?.priority).toBe(20);

      const trigger = await jord.insertTrigger({
        name: "Log insert",
        tableName: "records",
        event: "insert",
        actions: JSON.stringify([{ kind: "log", config: {} }]),
      });
      expect(await jord.listTriggersFor("records", "insert")).toEqual([
        trigger,
      ]);
      expect(jord.compileTriggerSql?.(trigger)).toBeNull();
      expect(jord.compilePolicySql?.(policy)).toBeNull();
      await jord.syncRecordsPoliciesRls?.();

      expect(await jord.deletePolicy(policy.id)).toBe(true);
      expect(await jord.deleteTrigger(trigger.id)).toBe(true);
      expect(await jord.getPolicy(policy.id)).toBeNull();
    } finally {
      await jord.close();
    }
  });
});
