import { describe, expect, it } from "vitest";

import {
  cancelActiveSqlQuery,
  normalizeSqlQueryId,
  registerActiveSqlQuery,
  resetActiveSqlQueries,
  unregisterActiveSqlQuery,
} from "./active-queries.js";

describe("S0065 active sql query registry", () => {
  it("registers, cancels, and unregisters a query id", () => {
    resetActiveSqlQueries();
    const id = "q-1";
    const controller = registerActiveSqlQuery(id);
    expect(controller.signal.aborted).toBe(false);
    expect(cancelActiveSqlQuery(id)).toBe(true);
    expect(controller.signal.aborted).toBe(true);
    expect(cancelActiveSqlQuery(id)).toBe(false);
    unregisterActiveSqlQuery(id, controller);
    expect(cancelActiveSqlQuery(id)).toBe(false);
  });

  it("normalizes query ids", () => {
    expect(normalizeSqlQueryId("abc-123")).toBe("abc-123");
    expect(normalizeSqlQueryId("")).toBeNull();
    expect(normalizeSqlQueryId("bad id")).toBeNull();
  });
});
