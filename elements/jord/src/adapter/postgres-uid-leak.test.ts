import { Pool } from "pg";
import { describe, expect, it } from "vitest";

const postgresUrl = process.env.JORD_TEST_POSTGRES_URL?.trim() ?? "";

/**
 * S0021-C pool leak. `set_config(..., true)` is transaction-local.
 * Skipped unless JORD_TEST_POSTGRES_URL is set. This file does not start Docker.
 */
describe.runIf(Boolean(postgresUrl))("postgres uid does not leak across the pool", () => {
  it("clears jord.uid when the transaction ends", async () => {
    const pool = new Pool({ connectionString: postgresUrl, max: 1 });
    try {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SELECT set_config('jord.uid', 'alice', true)");
        const inside = await client.query(
          "SELECT current_setting('jord.uid', true) AS uid",
        );
        expect(inside.rows[0]?.uid).toBe("alice");
        await client.query("COMMIT");
      } finally {
        client.release();
      }
      const outside = await pool.query(
        "SELECT current_setting('jord.uid', true) AS uid",
      );
      expect(outside.rows[0]?.uid ?? "").not.toBe("alice");
    } finally {
      await pool.end();
    }
  });
});
