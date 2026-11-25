/**
 * Per-project data-plane fan-out (S0097 / jord-F0021).
 *
 * Studio forwards `X-Jord-Project`. The control plane (project registry, keys,
 * operator auth) always stays on the server primary. Schema / tables / rows /
 * SQL / records for a registered slug open (and cache) that project's target.
 */

import { AsyncLocalStorage } from "node:async_hooks";

import {
  createJordClient,
  type JordDriverPort,
  type JordProjectEngine,
  type SecretPort,
} from "@altr/jord";

import {
  projectClientOptions,
  type ProjectConnectInput,
  type ProjectTlsMode,
} from "./connect-test.js";

export const PROJECT_HEADER = "x-jord-project";
export const DEFAULT_PROJECT_SLUG = "default";

export type ProjectPlaneDeps = {
  primary: JordDriverPort;
  secrets: SecretPort | null;
};

type CachedPlane = {
  projectId: string;
  slug: string;
  signature: string;
  jord: JordDriverPort;
};

type ProjectRow = {
  id: string;
  slug: string;
  engine: JordProjectEngine;
  target: string;
  tls_mode: ProjectTlsMode | null;
  db_user: string | null;
  status: string;
};

export type ResolvePlaneResult =
  | { ok: true; jord: JordDriverPort; slug: string | null; isPrimary: boolean }
  | { ok: false; status: 404 | 410 | 503; error: string; reason?: string };

/** Request-scoped data-plane binding (S0097 / S0098). */
export type PlaneContext = {
  jord: JordDriverPort;
  /** `null` when unbound / primary without an explicit `default` slug. */
  slug: string | null;
};

function ph(jord: JordDriverPort, n: number): string {
  return jord.dialect === "postgres" ? `$${n}` : "?";
}

function secretId(projectId: string): string {
  return `project:${projectId}:db_password`;
}

function connectionSignature(row: ProjectRow, password: string | null): string {
  return [
    row.id,
    row.engine,
    row.target,
    row.tls_mode ?? "",
    row.db_user ?? "",
    password ?? "",
  ].join("\0");
}

function staysOnPrimary(path: string): boolean {
  const p = path.split("?")[0] ?? path;
  if (p === "/health" || p.startsWith("/health/")) return true;
  if (p.startsWith("/admin/projects")) return true;
  if (p.startsWith("/studio/projects")) return true;
  // Operator login / session against primary control plane.
  if (p === "/auth/login" || p === "/auth/logout" || p === "/auth/me") {
    return true;
  }
  if (p === "/auth/anon-key") return true;
  return false;
}

export function createScopedJordPort(
  primary: JordDriverPort,
  als: AsyncLocalStorage<PlaneContext>,
): JordDriverPort {
  return new Proxy(primary, {
    get(target, prop, _receiver) {
      const active = als.getStore()?.jord ?? target;
      const value = Reflect.get(active, prop, active);
      if (typeof value === "function") {
        return value.bind(active);
      }
      return value;
    },
  }) as JordDriverPort;
}

export class ProjectDataPlane {
  private readonly cache = new Map<string, CachedPlane>();
  private readonly inflight = new Map<string, Promise<ResolvePlaneResult>>();
  readonly als = new AsyncLocalStorage<PlaneContext>();

  constructor(private readonly deps: ProjectPlaneDeps) {}

  get primary(): JordDriverPort {
    return this.deps.primary;
  }

  /** Active binding for this async context (S0098). */
  context(): PlaneContext {
    return (
      this.als.getStore() ?? {
        jord: this.deps.primary,
        slug: null,
      }
    );
  }

  run<T>(jord: JordDriverPort, slug: string | null, fn: () => T): T {
    return this.als.run({ jord, slug }, fn);
  }

  /** Drop a cached driver (archive / rotate password). */
  async invalidate(slug: string): Promise<void> {
    const key = slug.trim();
    const hit = this.cache.get(key);
    if (!hit) return;
    this.cache.delete(key);
    try {
      await hit.jord.close();
    } catch {
      /* ignore close errors */
    }
  }

  async close(): Promise<void> {
    const entries = [...this.cache.values()];
    this.cache.clear();
    this.inflight.clear();
    await Promise.all(
      entries.map(async (e) => {
        try {
          await e.jord.close();
        } catch {
          /* ignore */
        }
      }),
    );
  }

  async resolve(slugRaw: string | null | undefined): Promise<ResolvePlaneResult> {
    const slug = slugRaw?.trim() || null;
    if (!slug || slug === DEFAULT_PROJECT_SLUG) {
      return {
        ok: true,
        jord: this.deps.primary,
        slug: slug === DEFAULT_PROJECT_SLUG ? DEFAULT_PROJECT_SLUG : null,
        isPrimary: true,
      };
    }

    const cached = this.cache.get(slug);
    if (cached) {
      return { ok: true, jord: cached.jord, slug, isPrimary: false };
    }

    const pending = this.inflight.get(slug);
    if (pending) return pending;

    const work = this.openProject(slug).finally(() => {
      this.inflight.delete(slug);
    });
    this.inflight.set(slug, work);
    return work;
  }

  private async openProject(slug: string): Promise<ResolvePlaneResult> {
    const jord = this.deps.primary;
    let rows: Array<Record<string, unknown>>;
    try {
      rows = await jord.query(
        `SELECT id, slug, engine, target, tls_mode, db_user, status
         FROM jord_projects
         WHERE slug = ${ph(jord, 1)}
         LIMIT 1`,
        [slug],
      );
    } catch {
      return {
        ok: false,
        status: 503,
        error: "project_registry_unavailable",
        reason: "control-plane project lookup failed",
      };
    }

    const row = rows[0];
    if (!row) {
      return { ok: false, status: 404, error: "project_not_found" };
    }

    if (String(row.status) === "archived") {
      return {
        ok: false,
        status: 410,
        error: "project_archived",
        reason: "project is archived; keys are revoked",
      };
    }

    const project: ProjectRow = {
      id: String(row.id),
      slug: String(row.slug),
      engine: String(row.engine) as JordProjectEngine,
      target: String(row.target),
      tls_mode: (row.tls_mode as ProjectTlsMode | null) ?? null,
      db_user: row.db_user == null ? null : String(row.db_user),
      status: String(row.status),
    };

    let password: string | null = null;
    const needsSecret =
      project.engine === "libsql-turso" || project.engine === "postgres";
    if (needsSecret) {
      if (!this.deps.secrets) {
        return {
          ok: false,
          status: 503,
          error: "master_key_required",
          reason: "cannot open project target without JORD_MASTER_KEY",
        };
      }
      try {
        password = await this.deps.secrets.getSecret(secretId(project.id));
      } catch {
        // libSQL file projects often have no password; Turso/Postgres need one.
        if (project.engine !== "libsql-file") {
          password = null;
        }
      }
      if (
        project.engine === "libsql-turso" &&
        (password == null || password.trim() === "")
      ) {
        return {
          ok: false,
          status: 503,
          error: "project_secret_missing",
          reason: "stored Turso auth token is missing; re-register the project",
        };
      }
    } else if (this.deps.secrets) {
      try {
        password = await this.deps.secrets.getSecret(secretId(project.id));
      } catch {
        password = null;
      }
    }

    const connectInput: ProjectConnectInput = {
      engine: project.engine,
      target: project.target,
      dbUser: project.db_user,
      password,
      tlsMode: project.tls_mode,
    };
    const signature = connectionSignature(project, password);
    const existing = this.cache.get(slug);
    if (existing && existing.signature === signature) {
      return { ok: true, jord: existing.jord, slug, isPrimary: false };
    }
    if (existing) {
      this.cache.delete(slug);
      try {
        await existing.jord.close();
      } catch {
        /* ignore */
      }
    }

    try {
      const opts = projectClientOptions(connectInput);
      const driver = await createJordClient(opts);
      this.cache.set(slug, {
        projectId: project.id,
        slug,
        signature,
        jord: driver,
      });
      return { ok: true, jord: driver, slug, isPrimary: false };
    } catch (err) {
      return {
        ok: false,
        status: 503,
        error: "project_connect_failed",
        reason: err instanceof Error ? err.message : String(err),
      };
    }
  }

/** Whether this path must keep using the server primary database. */
  staysOnPrimary(path: string): boolean {
    return staysOnPrimary(path);
  }
}
