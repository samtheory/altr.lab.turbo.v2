export const PRINCIPAL_KINDS = [
  "service",
  "user",
  "anon",
  "operator",
] as const;

export type PrincipalKind = (typeof PRINCIPAL_KINDS)[number];

/** The only auth subject passed into route handlers. */
export type Principal = {
  kind: PrincipalKind;
  uid?: string;
  role: string;
  claims: Record<string, unknown>;
};

export function isPrincipalKind(value: string): value is PrincipalKind {
  return (PRINCIPAL_KINDS as readonly string[]).includes(value);
}
