import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import type { JordAuthVariables } from "../auth/middleware.js";
import {
  createAdminBucket,
  getAdminBucket,
  listAdminBuckets,
  parseBucketProvider,
  patchAdminBucket,
  rotateAdminBucketCredentials,
  setAdminBucketStatus,
  testAdminBucket,
  type BucketAdminDeps,
  type BucketCreateInput,
  type BucketPatchInput,
} from "./bucket-admin.js";

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = (await request.json()) as unknown;
    if (!body || typeof body !== "object" || Array.isArray(body)) return {};
    return body as Record<string, unknown>;
  } catch {
    return {};
  }
}

function requireAdmin(c: {
  get: (key: "principal") => JordAuthVariables["principal"];
}) {
  const principal = c.get("principal");
  if (principal.kind !== "operator" || principal.role !== "admin") {
    throw new HTTPException(403, { message: "admin operator only" });
  }
  return principal;
}

function asOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  return value;
}

function asOptionalBool(value: unknown): boolean | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "boolean") return value;
  return undefined;
}

function asOptionalNumber(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return undefined;
}

function asOptionalStringArray(value: unknown): string[] | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (!Array.isArray(value)) return undefined;
  if (!value.every((item) => typeof item === "string")) return undefined;
  return value;
}

function parseCreateBody(body: Record<string, unknown>): BucketCreateInput | {
  error: string;
} {
  const provider = parseBucketProvider(body.provider);
  if (!provider) return { error: "invalid_provider" };
  const name = typeof body.name === "string" ? body.name : "";
  return {
    name,
    provider,
    endpoint: asOptionalString(body.endpoint) ?? null,
    region: asOptionalString(body.region) ?? null,
    physical_bucket: asOptionalString(body.physical_bucket) ?? null,
    key_prefix: asOptionalString(body.key_prefix) ?? null,
    force_path_style: asOptionalBool(body.force_path_style) ?? null,
    public_read: asOptionalBool(body.public_read) ?? null,
    max_object_bytes: asOptionalNumber(body.max_object_bytes) ?? null,
    allowed_mime_types: asOptionalStringArray(body.allowed_mime_types) ?? null,
    sign_ttl_seconds: asOptionalNumber(body.sign_ttl_seconds) ?? null,
    linked_table: asOptionalString(body.linked_table) ?? null,
    access_key: asOptionalString(body.access_key) ?? null,
    secret_key: asOptionalString(body.secret_key) ?? null,
    session_token: asOptionalString(body.session_token) ?? null,
  };
}

function parsePatchBody(body: Record<string, unknown>): BucketPatchInput | {
  error: string;
} {
  if (body.provider !== undefined) {
    const provider = parseBucketProvider(body.provider);
    if (!provider) return { error: "invalid_provider" };
  }
  const patch: BucketPatchInput = {};
  if (body.provider !== undefined) {
    patch.provider = parseBucketProvider(body.provider) ?? undefined;
  }
  if (body.endpoint !== undefined) patch.endpoint = asOptionalString(body.endpoint) ?? null;
  if (body.region !== undefined) patch.region = asOptionalString(body.region) ?? null;
  if (body.physical_bucket !== undefined) {
    patch.physical_bucket = asOptionalString(body.physical_bucket) ?? null;
  }
  if (body.key_prefix !== undefined) {
    patch.key_prefix = asOptionalString(body.key_prefix) ?? null;
  }
  if (body.force_path_style !== undefined) {
    patch.force_path_style = asOptionalBool(body.force_path_style) ?? null;
  }
  if (body.public_read !== undefined) {
    patch.public_read = asOptionalBool(body.public_read) ?? null;
  }
  if (body.max_object_bytes !== undefined) {
    patch.max_object_bytes = asOptionalNumber(body.max_object_bytes) ?? null;
  }
  if (body.allowed_mime_types !== undefined) {
    patch.allowed_mime_types =
      asOptionalStringArray(body.allowed_mime_types) ?? null;
  }
  if (body.sign_ttl_seconds !== undefined) {
    patch.sign_ttl_seconds = asOptionalNumber(body.sign_ttl_seconds) ?? null;
  }
  if (body.linked_table !== undefined) {
    patch.linked_table = asOptionalString(body.linked_table) ?? null;
  }
  if (body.access_key !== undefined) {
    patch.access_key = asOptionalString(body.access_key) ?? null;
  }
  if (body.secret_key !== undefined) {
    patch.secret_key = asOptionalString(body.secret_key) ?? null;
  }
  if (body.session_token !== undefined) {
    patch.session_token = asOptionalString(body.session_token) ?? null;
  }
  return patch;
}

export function createBucketAdminRoutes(
  deps: BucketAdminDeps,
): Hono<{ Variables: JordAuthVariables }> {
  const routes = new Hono<{ Variables: JordAuthVariables }>();

  routes.get("/buckets", async (c) => {
    requireAdmin(c);
    return c.json({ buckets: await listAdminBuckets(deps) });
  });

  routes.post("/buckets", async (c) => {
    const principal = requireAdmin(c);
    const body = await readJson(c.req.raw);
    const parsed = parseCreateBody(body);
    if ("error" in parsed) {
      return c.json({ error: parsed.error }, 400);
    }
    const result = await createAdminBucket(
      deps,
      parsed,
      principal.uid ?? principal.role,
    );
    if (!result.ok) {
      return c.json(
        {
          error: result.error,
          ...(result.detail ? { detail: result.detail } : {}),
        },
        result.status,
      );
    }
    return c.json({ bucket: result.bucket }, result.status);
  });

  routes.get("/buckets/:name", async (c) => {
    requireAdmin(c);
    const result = await getAdminBucket(deps, c.req.param("name"));
    if (!result.ok) {
      return c.json({ error: result.error }, result.status);
    }
    return c.json({ bucket: result.bucket });
  });

  routes.patch("/buckets/:name", async (c) => {
    requireAdmin(c);
    const body = await readJson(c.req.raw);
    const parsed = parsePatchBody(body);
    if ("error" in parsed) {
      return c.json({ error: parsed.error }, 400);
    }
    const result = await patchAdminBucket(deps, c.req.param("name"), parsed);
    if (!result.ok) {
      return c.json(
        {
          error: result.error,
          ...(result.detail ? { detail: result.detail } : {}),
        },
        result.status,
      );
    }
    return c.json({ bucket: result.bucket });
  });

  routes.post("/buckets/:name/test", async (c) => {
    requireAdmin(c);
    const body = await readJson(c.req.raw);
    const result = await testAdminBucket(deps, c.req.param("name"), {
      provider: parseBucketProvider(body.provider) ?? undefined,
      endpoint: asOptionalString(body.endpoint),
      region: asOptionalString(body.region),
      physical_bucket: asOptionalString(body.physical_bucket),
      key_prefix: asOptionalString(body.key_prefix),
      force_path_style: asOptionalBool(body.force_path_style),
      access_key: asOptionalString(body.access_key),
      secret_key: asOptionalString(body.secret_key),
      session_token: asOptionalString(body.session_token),
    });
    if (!result.ok) {
      return c.json(
        {
          ok: false as const,
          error: result.error,
          ...(result.detail ? { detail: result.detail } : {}),
        },
        result.status,
      );
    }
    return c.json({ ok: true as const });
  });

  routes.post("/buckets/:name/rotate", async (c) => {
    requireAdmin(c);
    const body = await readJson(c.req.raw);
    const result = await rotateAdminBucketCredentials(deps, c.req.param("name"), {
      access_key: asOptionalString(body.access_key),
      secret_key: asOptionalString(body.secret_key),
      session_token: asOptionalString(body.session_token),
    });
    if (!result.ok) {
      return c.json(
        {
          error: result.error,
          ...(result.detail ? { detail: result.detail } : {}),
        },
        result.status,
      );
    }
    return c.json({ bucket: result.bucket });
  });

  routes.post("/buckets/:name/pause", async (c) => {
    requireAdmin(c);
    const result = await setAdminBucketStatus(
      deps,
      c.req.param("name"),
      "paused",
    );
    if (!result.ok) {
      return c.json({ error: result.error }, result.status);
    }
    return c.json({ bucket: result.bucket });
  });

  routes.post("/buckets/:name/resume", async (c) => {
    requireAdmin(c);
    const result = await setAdminBucketStatus(
      deps,
      c.req.param("name"),
      "active",
    );
    if (!result.ok) {
      return c.json({ error: result.error }, result.status);
    }
    return c.json({ bucket: result.bucket });
  });

  return routes;
}
