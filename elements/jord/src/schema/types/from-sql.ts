import { TYPE_REGISTRY } from "./registry.js";
import type {
  JordDialect,
  LogicalColumnType,
  TypeParams,
} from "./types.js";

/**
 * Reverse-map an introspected SQL type string to a registry id + params,
 * or `{ kind: "custom", readOnly: true }` when nothing matches.
 *
 * More-specific registry entries are tried before generic ones by walking
 * the registry in reverse family priority (see matchOrder).
 */
export function fromSql(
  dialect: JordDialect,
  rawType: string,
): LogicalColumnType {
  const raw = rawType?.trim() ?? "";
  if (raw === "") {
    return { kind: "custom", raw: rawType ?? "", readOnly: true };
  }

  const candidates = matchOrder(dialect);
  for (const entry of candidates) {
    const dialectSql = entry.dialects[dialect];
    if (!dialectSql) continue;
    const params = dialectSql.parse(raw);
    if (params == null) continue;
    return {
      kind: "known",
      id: entry.id,
      params: params as TypeParams,
      raw,
      readOnly: false,
    };
  }

  return { kind: "custom", raw, readOnly: true };
}

/** Prefer specific ids before catch-alls when multiple parsers could fire. */
function matchOrder(dialect: JordDialect) {
  const priority = (id: string): number => {
    switch (id) {
      case "timestamptz":
      case "timetz":
      case "jsonb":
      case "citext":
      case "array":
      case "varchar":
      case "char":
      case "numeric":
      case "decimal":
      case "double":
      case "bigint":
      case "smallint":
      case "uuid":
      case "json":
      case "boolean":
      case "datetime":
        return 0;
      case "timestamp":
      case "time":
      case "date":
      case "integer":
      case "real":
      case "blob":
      case "inet":
      case "cidr":
      case "macaddr":
        return 1;
      case "text":
        return 2;
      case "enum_text":
        return 99;
      default:
        return 5;
    }
  };

  return [...TYPE_REGISTRY]
    .filter((e) => e.dialects[dialect] != null)
    .sort((a, b) => priority(a.id) - priority(b.id));
}
