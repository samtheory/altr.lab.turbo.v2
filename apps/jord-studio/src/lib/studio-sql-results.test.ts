import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  attachSqlRowIds,
  exportSqlRowsCsv,
  exportSqlRowsJson,
  sqlResultColumns,
  visibleSqlRows,
} from "./studio-sql-results";

describe("studio-sql-results export", () => {
  it("CSV matches the visible filtered set", () => {
    const rows = attachSqlRowIds([
      { name: "alpha", n: 1 },
      { name: "beta", n: 2 },
      { name: "gamma", n: 3 },
    ]);
    const columns = sqlResultColumns(["name", "n"]);
    const visible = visibleSqlRows(rows, columns, {
      filters: [
        { id: "f1", columnId: "name", operator: "contains", value: "mm" },
      ],
    });
    // only gamma contains "mm"
    assert.equal(visible.length, 1);
    const csv = exportSqlRowsCsv(visible, ["name", "n"]);
    assert.equal(csv, ["name,n", "gamma,3"].join("\n"));
    assert.ok(!csv.includes("alpha"));
    assert.ok(!csv.includes("beta"));
  });

  it("JSON export drops internal row ids", () => {
    const rows = attachSqlRowIds([{ name: "x", n: 9 }]);
    const json = exportSqlRowsJson(rows, ["name", "n"]);
    assert.deepEqual(JSON.parse(json), [{ name: "x", n: 9 }]);
  });
});
