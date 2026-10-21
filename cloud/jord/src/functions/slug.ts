/** Path segment for /x/:slug and function.slug — no slashes. */
const SLUG_RE = /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/;

export function isValidApiSlug(value: string): boolean {
  return SLUG_RE.test(value);
}

export const CUSTOM_HTTP_METHODS = ["GET", "POST", "PATCH", "DELETE"] as const;

export type CustomHttpMethod = (typeof CUSTOM_HTTP_METHODS)[number];

export function isCustomHttpMethod(value: string): value is CustomHttpMethod {
  return (CUSTOM_HTTP_METHODS as readonly string[]).includes(value);
}

/** Env boot seed: comma-separated custom API ids or slugs disabled at lookup. */
export function parseCustomApiDisabledEnv(
  env: NodeJS.ProcessEnv = process.env,
): Set<string> {
  const raw = env.JORD_CUSTOM_API_DISABLED ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

export function isCustomApiEnvDisabled(
  api: { id: string; slug: string },
  disabled: Set<string>,
): boolean {
  return disabled.has(api.id) || disabled.has(api.slug);
}
