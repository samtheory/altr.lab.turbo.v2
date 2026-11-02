/** Policy list helpers + affected-row preview for the per-table Policies drawer (S0059). */

export type PolicyRuleDraft = {
  kind: string;
  config: Record<string, unknown>;
};

export type PolicyFilterSummary = {
  text: string;
  rowColumns: string[];
};

export function parsePolicyRules(raw: string): PolicyRuleDraft[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is { kind: string; config?: Record<string, unknown> } =>
          !!item &&
          typeof item === "object" &&
          typeof (item as { kind?: unknown }).kind === "string",
      )
      .map((item) => ({
        kind: item.kind,
        config:
          item.config && typeof item.config === "object" && !Array.isArray(item.config)
            ? (item.config as Record<string, unknown>)
            : {},
      }));
  } catch {
    return [];
  }
}

export function summarizePolicyRules(raw: string): PolicyFilterSummary {
  const rules = parsePolicyRules(raw);
  if (rules.length === 0) {
    return { text: "(no rules)", rowColumns: [] };
  }
  const parts: string[] = [];
  const rowColumns: string[] = [];
  for (const rule of rules) {
    switch (rule.kind) {
      case "role_in": {
        const roles = Array.isArray(rule.config.roles)
          ? rule.config.roles.filter((r): r is string => typeof r === "string")
          : [];
        parts.push(`role∈[${roles.join(",")}]`);
        break;
      }
      case "bucket_in": {
        const buckets = Array.isArray(rule.config.buckets)
          ? rule.config.buckets.filter((b): b is string => typeof b === "string")
          : [];
        parts.push(`bucket∈[${buckets.join(",")}]`);
        break;
      }
      case "bucket_eq":
        parts.push(
          typeof rule.config.bucket === "string"
            ? `bucket=${rule.config.bucket}`
            : "bucket_eq",
        );
        break;
      case "always":
        parts.push("always");
        break;
      case "owner_eq": {
        const col =
          typeof rule.config.column === "string" ? rule.config.column : "?";
        parts.push(`${col}=uid`);
        if (typeof rule.config.column === "string") {
          rowColumns.push(rule.config.column);
        }
        break;
      }
      case "claim_eq": {
        const col =
          typeof rule.config.column === "string" ? rule.config.column : "?";
        const claim =
          typeof rule.config.claim === "string" ? rule.config.claim : "?";
        parts.push(`${col}=claim:${claim}`);
        if (typeof rule.config.column === "string") {
          rowColumns.push(rule.config.column);
        }
        break;
      }
      default:
        parts.push(rule.kind);
    }
  }
  return { text: parts.join(" ∧ "), rowColumns };
}

export function serializePolicyRules(rules: PolicyRuleDraft[]): string {
  return JSON.stringify(
    rules.map((r) => ({
      kind: r.kind,
      ...(Object.keys(r.config).length > 0 ? { config: r.config } : {}),
    })),
  );
}

/** Build table-API query for affected-row preview as the current principal. */
export function buildAffectedRowsQuery(args: {
  schema: string;
  rulesJson: string;
  previewValue: string;
  limit?: number;
}): { pathQuery: string; note: string } {
  const limit = args.limit ?? 5;
  const params = new URLSearchParams();
  if (args.schema && args.schema !== "public" && args.schema !== "main") {
    params.set("schema", args.schema);
  }
  params.set("limit", String(limit));
  params.set("count", "exact");

  const summary = summarizePolicyRules(args.rulesJson);
  const value = args.previewValue.trim();
  if (summary.rowColumns.length > 0 && value) {
    // Preview the first row-scoped column as eq.<principal value>.
    params.set(summary.rowColumns[0]!, `eq.${value}`);
    return {
      pathQuery: params.toString(),
      note: `Filtered ${summary.rowColumns[0]}=eq.${value} (draft row scope) as your session.`,
    };
  }
  if (summary.rowColumns.length > 0) {
    return {
      pathQuery: params.toString(),
      note: `Row scope on ${summary.rowColumns.join(", ")} — enter a preview uid/claim value to filter, or run to see what your session already sees.`,
    };
  }
  return {
    pathQuery: params.toString(),
    note: "No row filter in rules — preview is what the current principal can select under saved policies.",
  };
}

export function defaultRuleDraft(kind: string): PolicyRuleDraft {
  switch (kind) {
    case "role_in":
      return { kind, config: { roles: ["user"] } };
    case "bucket_in":
      return { kind, config: { buckets: ["lab"] } };
    case "bucket_eq":
      return { kind, config: { bucket: "lab" } };
    case "owner_eq":
      return { kind, config: { column: "owner_id" } };
    case "claim_eq":
      return { kind, config: { claim: "email", column: "owner_email" } };
    case "always":
      return { kind, config: {} };
    default:
      return { kind, config: {} };
  }
}
