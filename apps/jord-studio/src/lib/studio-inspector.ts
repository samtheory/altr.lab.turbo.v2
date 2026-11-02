/** URL-addressable Studio inspector (S0048). */

export const INSPECTOR_PARAM = "inspector";

/** Query keys kept as inspector props (deep-linkable). */
export const INSPECTOR_PROP_KEYS = [
  "recordId",
  "table",
  "schema",
  "seedPk",
] as const;

export type InspectorPropKey = (typeof INSPECTOR_PROP_KEYS)[number];

export const INSPECTOR_IDS = [
  "create-record",
  "create-table",
  "record-detail",
  "migrate",
  "insert-table-row",
] as const;

export type InspectorId = (typeof INSPECTOR_IDS)[number];

export type InspectorProps = Partial<Record<InspectorPropKey, string>>;

export type InspectorState = {
  id: InspectorId;
  props: InspectorProps;
};

export function isInspectorId(value: string | null | undefined): value is InspectorId {
  return (
    value != null &&
    (INSPECTOR_IDS as readonly string[]).includes(value)
  );
}

export function parseInspectorSearch(
  params: URLSearchParams | { get(name: string): string | null },
): InspectorState | null {
  const raw = params.get(INSPECTOR_PARAM);
  if (!isInspectorId(raw)) return null;
  const props: InspectorProps = {};
  for (const key of INSPECTOR_PROP_KEYS) {
    const v = params.get(key);
    if (v != null && v !== "") props[key] = v;
  }
  if (raw === "record-detail" && !props.recordId) return null;
  if (raw === "insert-table-row" && !props.table) return null;
  return { id: raw, props };
}

/** Mutates a copy: set inspector state or clear inspector + prop keys. */
export function withInspectorSearch(
  params: URLSearchParams,
  state: InspectorState | null,
): URLSearchParams {
  const next = new URLSearchParams(params.toString());
  next.delete(INSPECTOR_PARAM);
  for (const key of INSPECTOR_PROP_KEYS) next.delete(key);
  if (!state) return next;
  next.set(INSPECTOR_PARAM, state.id);
  for (const key of INSPECTOR_PROP_KEYS) {
    const v = state.props[key];
    if (v != null && v !== "") next.set(key, v);
  }
  return next;
}

export function inspectorHref(
  pathname: string,
  current: URLSearchParams,
  state: InspectorState | null,
): string {
  const next = withInspectorSearch(current, state);
  const q = next.toString();
  return q ? `${pathname}?${q}` : pathname;
}

export function inspectorTitle(id: InspectorId): string {
  switch (id) {
    case "create-record":
      return "Insert row";
    case "create-table":
      return "Create table";
    case "record-detail":
      return "Edit row";
    case "migrate":
      return "Migrate wizard";
    case "insert-table-row":
      return "Insert table row";
  }
}
