export const BUILTIN_TRIGGER_ACTION_KINDS = [
  "log",
  "invoke_function",
  "echo",
] as const;

export type BuiltinTriggerActionKind =
  (typeof BUILTIN_TRIGGER_ACTION_KINDS)[number];

export function isBuiltinTriggerActionKind(
  value: string,
): value is BuiltinTriggerActionKind {
  return (BUILTIN_TRIGGER_ACTION_KINDS as readonly string[]).includes(value);
}

export type TriggerAction = {
  kind: string;
  config?: Record<string, unknown>;
};

export function parseActionsJson(raw: string): TriggerAction[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is TriggerAction =>
        !!item &&
        typeof item === "object" &&
        typeof (item as TriggerAction).kind === "string",
    );
  } catch {
    return [];
  }
}

export function actionFailHard(config: Record<string, unknown> | undefined): boolean {
  return config?.failHard === true;
}
