export const BUILTIN_POLICY_RULE_KINDS = [
  "role_in",
  "bucket_in",
  "bucket_eq",
  "always",
  "owner_eq",
  "claim_eq",
] as const;

export const BUILTIN_TRIGGER_ACTION_KINDS = [
  "log",
  "invoke_function",
  "echo",
] as const;

export const POLICY_OPERATIONS = [
  "select",
  "insert",
  "update",
  "delete",
] as const;

export const POLICY_EFFECTS = ["allow", "deny"] as const;

export const TRIGGER_EVENTS = ["insert", "update", "delete"] as const;

export type PublicPolicy = {
  id: string;
  name: string;
  table_name: string;
  operation: string;
  effect: string;
  rules: string;
  priority: number;
  enabled: boolean;
  created_at: number;
  updated_at: number;
};

export type PublicTrigger = {
  id: string;
  name: string;
  table_name: string;
  timing: string;
  event: string;
  actions: string;
  enabled: boolean;
  created_at: number;
  updated_at: number;
};
