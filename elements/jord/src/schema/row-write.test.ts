import { describe, expect, it } from "vitest";

import type { JordTableInfo } from "../port.js";
import { planInsertRow, planUpdateRow } from "./row-write.js";

const notes: JordTableInfo = {
  name: "lab_notes",
  columns: [
    { name: "id", type: "TEXT", notnull: true, pk: true, dflt_value: null },
    { name: "title", type: "TEXT", notnull: false, pk: false, dflt_value: null },
    { name: "n", type: "INTEGER", notnull: false, pk: false, dflt_value: null },
  ],
};

describe("plan user-table writes", () => {
  it("requires a primary key and rejects unknown columns", () => {
    const missing = planInsertRow(notes, { title: "a" });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.error).toBe("missing_pk");

    const unknown = planInsertRow(notes, { id: "1", nope: 1 });
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) expect(unknown.error).toBe("unknown_column");

    const bad = planInsertRow(notes, { id: "1", n: 1.5 });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error).toBe("bad_value");
  });

  it("rejects reserved tables and empty patches", () => {
    const reserved = planInsertRow(
      { ...notes, name: "records" },
      { id: "1", title: "a" },
    );
    expect(reserved.ok).toBe(false);
    if (!reserved.ok) expect(reserved.error).toBe("reserved");

    const empty = planUpdateRow(notes, "1", { id: "1" });
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.error).toBe("empty_patch");
  });
});
