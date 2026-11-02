import type { DataGridColumnType } from "@altr/apolyx";

/** Map introspected SQL type strings → DataGrid filter/sort kinds (S0052/S0056). */
export function sqlTypeToGridType(sqlType: string): DataGridColumnType {
  const t = sqlType.trim().toUpperCase();
  if (
    t === "BOOLEAN" ||
    t === "BOOL" ||
    t.includes("BOOLEAN")
  ) {
    return "boolean";
  }
  if (
    t.includes("INT") ||
    t.includes("REAL") ||
    t.includes("FLOA") ||
    t.includes("DOUBLE") ||
    t.includes("NUMERIC") ||
    t.includes("DECIMAL") ||
    t === "BIGINT" ||
    t === "SMALLINT" ||
    t === "SERIAL" ||
    t === "BIGSERIAL"
  ) {
    return "number";
  }
  if (
    t.includes("DATE") ||
    t.includes("TIME") ||
    t.includes("TIMESTAMP")
  ) {
    return "date";
  }
  if (t.includes("JSON") || t === "JSONB") {
    return "json";
  }
  if (t.includes("UUID") || t.includes("TEXT") || t.includes("CHAR") || t.includes("CLOB")) {
    return "text";
  }
  return "unknown";
}
