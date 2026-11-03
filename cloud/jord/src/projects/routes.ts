import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { auditKeyEvent, parseOverlapSeconds } from "../auth/key-sets.js";
import type { JordAuthVariables } from "../auth/middleware.js";
import {
  getErdLayout,
  normalizeLayoutSchema,
  parseLayoutNodes,
  putErdLayout,
  resolveProjectId,
} from "./layout.js";
import {
  archiveProject,
  createProject,
  getProject,
  getProjectBySlug,
  listActiveProjectSummaries,
  listProjects,
  parseEngine,
  parseTlsMode,
  patchProject,
  revokePreviousProjectKeys,
  rotateProjectKeys,
  testProjectConnect,
  type ProjectRegistryDeps,
} from "./registry.js";
import type { ProjectTlsMode } from "./connect-test.js";

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = (await request.json()) as unknown;
    if (!body || typeof body !== "object" || Array.isArray(body)) return {};
    return body as Record<string, unknown>;
  } catch {
    return {};
  }
}

function requireAdmin(c: { get: (key: "principal") => JordAuthVariables["principal"] }) {
  const principal = c.get("principal");
  if (principal.kind !== "operator" || principal.role !== "admin") {
    throw new HTTPException(403, { message: "admin operator only" });
  }
}

function requireSecrets(deps: ProjectRegistryDeps): void {
  if (!deps.secrets) {
    throw new HTTPException(503, {
      message: "JORD_MASTER_KEY is required for the project registry",
    });
  }
}

export function createProjectRoutes(
  deps: ProjectRegistryDeps,
): Hono<{ Variables: JordAuthVariables }> {
  const routes = new Hono<{ Variables: JordAuthVariables }>();

  routes.get("/projects", async (c) => {
    requireAdmin(c);
    requireSecrets(deps);
    return c.json({ projects: await listProjects(deps) });
  });

  routes.post("/projects/test", async (c) => {
    requireAdmin(c);
    const body = await readJson(c.req.raw);
    const engine = parseEngine(body.engine);
    if (!engine) return c.json({ error: "invalid_engine" }, 400);
    const target = typeof body.target === "string" ? body.target : "";
    if (!target.trim()) return c.json({ error: "target is required" }, 400);
    const tls = parseTlsMode(body.tls_mode);
    if (body.tls_mode !== undefined && tls === undefined) {
      return c.json({ error: "invalid_tls_mode" }, 400);
    }
    const result = await testProjectConnect(deps, {
      engine,
      target,
      dbUser: typeof body.db_user === "string" ? body.db_user : null,
      password: typeof body.password === "string" ? body.password : null,
      tlsMode: (tls ?? null) as ProjectTlsMode | null,
    });
    if (!result.ok) {
      return c.json({ ok: false as const, error: result.error }, 400);
    }
    return c.json({ ok: true as const });
  });

  routes.post("/projects", async (c) => {
    requireAdmin(c);
    requireSecrets(deps);
    const body = await readJson(c.req.raw);
    const engine = parseEngine(body.engine);
    if (!engine) return c.json({ error: "invalid_engine" }, 400);
    const tls = parseTlsMode(body.tls_mode);
    if (body.tls_mode !== undefined && tls === undefined) {
      return c.json({ error: "invalid_tls_mode" }, 400);
    }
    const result = await createProject(deps, {
      slug: typeof body.slug === "string" ? body.slug : "",
      engine,
      target: typeof body.target === "string" ? body.target : "",
      tls_mode: tls === undefined ? null : tls,
      db_user: typeof body.db_user === "string" ? body.db_user : null,
      password: typeof body.password === "string" ? body.password : null,
      notes: typeof body.notes === "string" ? body.notes : "",
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
    return c.json(
      {
        project: result.project,
        secret_key: result.secret_key,
        publishable_key: result.publishable_key,
        barrier_key: result.barrier_key,
      },
      201,
    );
  });

  // Must register before /projects/:id so "by-slug" is not treated as an id.
  routes.get("/projects/by-slug/:slug", async (c) => {
    requireAdmin(c);
    requireSecrets(deps);
    const result = await getProjectBySlug(deps, c.req.param("slug"));
    if (!result.ok) {
      return c.json(
        {
          error: result.error,
          ...(result.reason ? { reason: result.reason } : {}),
        },
        result.status,
      );
    }
    return c.json({ project: result.project });
  });

  routes.get("/projects/:id", async (c) => {
    requireAdmin(c);
    requireSecrets(deps);
    const result = await getProject(deps, c.req.param("id"));
    if (!result.ok) {
      return c.json(
        {
          error: result.error,
          ...(result.reason ? { reason: result.reason } : {}),
        },
        result.status,
      );
    }
    return c.json({ project: result.project });
  });

  routes.patch("/projects/:id", async (c) => {
    requireAdmin(c);
    requireSecrets(deps);
    const body = await readJson(c.req.raw);
    const result = await patchProject(deps, c.req.param("id"), {
      notes: typeof body.notes === "string" ? body.notes : undefined,
      status: body.status === "active" ? "active" : undefined,
    });
    if (!result.ok) {
      return c.json(
        {
          error: result.error,
          ...(result.reason ? { reason: result.reason } : {}),
        },
        result.status,
      );
    }
    return c.json({ project: result.project });
  });

  routes.delete("/projects/:id", async (c) => {
    requireAdmin(c);
    requireSecrets(deps);
    const result = await archiveProject(deps, c.req.param("id"));
    if (!result.ok) {
      return c.json(
        {
          error: result.error,
          ...(result.reason ? { reason: result.reason } : {}),
        },
        result.status,
      );
    }
    return c.json({ ok: true as const, status: "archived" as const });
  });

  // S0093: body `{ overlap_seconds?, revoke_previous? }`. Omitted overlap =
  // 24 h, explicit 0 = none; `revoke_previous: true` is the compromise path.
  routes.post("/projects/:id/rotate-keys", async (c) => {
    requireAdmin(c);
    requireSecrets(deps);
    const principal = c.get("principal");
    const body = await readJson(c.req.raw);
    const overlap = parseOverlapSeconds(body.overlap_seconds);
    if (!overlap.ok) {
      return c.json({ error: "invalid_overlap", message: overlap.error }, 400);
    }
    const revokePrevious = body.revoke_previous === true;
    const projectId = c.req.param("id");
    const result = await rotateProjectKeys(deps, projectId, {
      overlapSeconds: overlap.seconds,
      revokePrevious,
    });
    if (!result.ok) {
      return c.json(
        {
          error: result.error,
          ...(result.reason ? { reason: result.reason } : {}),
        },
        result.status,
      );
    }
    await auditKeyEvent(deps.jord, {
      source: "projects.keys",
      message: "project keys rotated",
      actor: principal.uid ?? principal.role,
      action: "rotated",
      detail: {
        project_id: result.project.id,
        revoke_previous: revokePrevious,
        previous_expires_at: result.previous_expires_at,
      },
    });
    // Plaintext keys are returned only here and by POST /projects (create),
    // shown once each; no read route ever returns them.
    return c.json({
      project: result.project,
      secret_key: result.secret_key,
      publishable_key: result.publishable_key,
      barrier_key: result.barrier_key,
      previous_expires_at: result.previous_expires_at,
    });
  });

  routes.post("/projects/:id/revoke-previous-keys", async (c) => {
    requireAdmin(c);
    requireSecrets(deps);
    const principal = c.get("principal");
    const result = await revokePreviousProjectKeys(deps, c.req.param("id"));
    if (!result.ok) {
      return c.json(
        {
          error: result.error,
          ...(result.reason ? { reason: result.reason } : {}),
        },
        result.status,
      );
    }
    await auditKeyEvent(deps.jord, {
      source: "projects.keys",
      message: "project previous keys revoked",
      actor: principal.uid ?? principal.role,
      action: "previous_revoked",
      detail: { project_id: c.req.param("id") },
    });
    return c.json({ ok: true as const });
  });

  // S0062 — ERD layout (control plane). :id accepts project UUID or slug.
  routes.get("/projects/:id/layout", async (c) => {
    requireAdmin(c);
    requireSecrets(deps);
    const schema = normalizeLayoutSchema(c.req.query("schema") ?? "public");
    if (!schema) return c.json({ error: "invalid_schema" }, 400);
    const resolved = await resolveProjectId(deps, c.req.param("id"));
    if (!resolved.ok) {
      return c.json(
        {
          error: resolved.error,
          ...(resolved.reason ? { reason: resolved.reason } : {}),
        },
        resolved.status,
      );
    }
    const layout = await getErdLayout(deps, resolved.id, schema);
    return c.json({ layout });
  });

  routes.put("/projects/:id/layout", async (c) => {
    requireAdmin(c);
    requireSecrets(deps);
    const body = await readJson(c.req.raw);
    const schema = normalizeLayoutSchema(
      typeof body.schema === "string" ? body.schema : c.req.query("schema"),
    );
    if (!schema) return c.json({ error: "invalid_schema" }, 400);
    const parsed = parseLayoutNodes(body.nodes);
    if (!parsed.ok) return c.json({ error: parsed.error }, 400);
    const resolved = await resolveProjectId(deps, c.req.param("id"));
    if (!resolved.ok) {
      return c.json(
        {
          error: resolved.error,
          ...(resolved.reason ? { reason: resolved.reason } : {}),
        },
        resolved.status,
      );
    }
    const layout = await putErdLayout(deps, resolved.id, schema, parsed.nodes);
    return c.json({ layout });
  });

  return routes;
}

/**
 * Authenticated Studio catalog (S0045) — any principal may list/resolve active
 * projects for routing + switcher. No secrets or keys in the payload.
 */
export function createStudioProjectRoutes(
  deps: ProjectRegistryDeps,
): Hono<{ Variables: JordAuthVariables }> {
  const routes = new Hono<{ Variables: JordAuthVariables }>();

  routes.get("/projects", async (c) => {
    if (!deps.secrets) {
      return c.json({ projects: [] as const });
    }
    const projects = await listActiveProjectSummaries(deps);
    return c.json({ projects });
  });

  routes.get("/projects/:slug", async (c) => {
    const slug = c.req.param("slug");
    if (!deps.secrets) {
      return c.json({ error: "project_not_found" }, 404);
    }
    const result = await getProjectBySlug(deps, slug);
    if (!result.ok) {
      return c.json(
        {
          error: result.error,
          ...(result.reason ? { reason: result.reason } : {}),
        },
        result.status,
      );
    }
    return c.json({
      project: {
        slug: result.project.slug,
        engine: result.project.engine,
        status: result.project.status,
        target: result.project.target,
      },
    });
  });

  return routes;
}
