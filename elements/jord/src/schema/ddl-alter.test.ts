import { describe, expect, it } from "vitest";

import type { JordTableInfo } from "../port.js";
import {
  planAlterColumn,
  planDropColumn,
  planDropTable,
  planRenameTable,
} from "./ddl-alter.js";

const sample: JordTableInfo = {
  name: "lab_notes",
  columns: [
    { name: "id", type: "TEXT", notnull: true, pk: true, dflt_value: null },
    { name: "body", type: "TEXT", notnull: false, pk: false, dflt_value: null },
    { name: "score", type: "INTEGER", notnull: false, pk: false, dflt_value: null },
  ],
};

describe("ddl-alter planners", () => {
  it("rejects reserved drop/rename table", () => {
    const drop = planDropTable("records");
    expect(drop.ok).toBe(false);
    if (!drop.ok) expect(drop.error).toBe("reserved");

    const rename = planRenameTable("lab_notes", "jord_meta");
    expect(rename.ok).toBe(false);
    if (!rename.ok) expect(rename.error).toBe("reserved");
  });

  it("blocks dropping the primary key", () => {
    const result = planDropColumn(sample, "id");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("pk_required");
  });

  it("plans column rename vs rebuild", () => {
    const rename = planAlterColumn(sample, "body", { name: "content" });
    expect(rename.ok).toBe(true);
    if (rename.ok) expect(rename.mode).toBe("rename");

    const typed = planAlterColumn(sample, "score", { type: "REAL" });
    expect(typed.ok).toBe(true);
    if (typed.ok) {
      expect(typed.mode).toBe("rebuild");
      if (typed.mode === "rebuild") expect(typed.nextType).toBe("REAL");
    }

    const pkType = planAlterColumn(sample, "id", { type: "INTEGER" });
    expect(pkType.ok).toBe(false);
    if (!pkType.ok) expect(pkType.error).toBe("pk_type_change");
  });

  it("rejects empty alter patch and missing column", () => {
    expect(planAlterColumn(sample, "body", {}).ok).toBe(false);
    const missing = planAlterColumn(sample, "nope", { name: "x" });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.error).toBe("column_not_found");
  });
});
