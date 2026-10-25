import type { MiddlewareHandler } from "hono";

export function parseCorsOrigins(env: NodeJS.ProcessEnv): string[] {
  const raw = env.JORD_CORS_ORIGINS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export function createCorsMiddleware(origins: string[]): MiddlewareHandler {
  const allow = new Set(origins);

  return async (c, next) => {
    const origin = c.req.header("Origin");
    if (!origin) {
      await next();
      return;
    }

    if (!allow.has(origin)) {
      if (c.req.method === "OPTIONS") {
        return c.body(null, 204);
      }
      await next();
      return;
    }

    c.header("Access-Control-Allow-Origin", origin);
    c.header("Access-Control-Allow-Credentials", "true");
    c.header(
      "Access-Control-Allow-Headers",
      "Authorization, Content-Type, Idempotency-Key",
    );
    c.header(
      "Access-Control-Allow-Methods",
      "GET,POST,PATCH,PUT,DELETE,OPTIONS",
    );
    c.header("Vary", "Origin");

    if (c.req.method === "OPTIONS") {
      return c.body(null, 204);
    }

    await next();
  };
}
