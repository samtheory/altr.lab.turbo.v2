import { randomUUID } from "node:crypto";

import {
  createJordClient,
  fsPathToFileUrl,
  type AesGcmSecretPort,
  type JordDriverPort,
  type JordProjectEngine,
  type JordProjectStatus,
  type SecretPort,
} from "@altr/jord";

import {
  defaultProjectConnectTest,
  type ProjectConnectInput,
  type ProjectConnectResult,
  type ProjectConnectTester,
  type ProjectTlsMode,
} from "./connect-test.js";
import { generateProjectKeySet, type GeneratedProjectKey } from "./keys.js";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ENGINES = new Set<JordProjectEngine>([
  "libsql-file",
  "libsql-turso",
  "postgres",
]);
const TLS_MODES = new Set<ProjectTlsMode>([
  "disable",
  "require",
  "verify-full",
]);

export type ProjectKeyPublic = {
  kind: string;
  prefix: string;
  last4: string;
  created_at: number;
  rotated_at: number | null;
};

export type ProjectPublic = {
  id: string;
  slug: string;
  engine: JordProjectEngine;
  target: string;
  tls_mode: ProjectTlsMode | null;
  db_user: string | null;
  notes: string;
  status: JordProjectStatus;
  created_at: number;
  archived_at: number | null;
  keys: ProjectKeyPublic[];
};

export type CreateProjectBody = {
  slug: string;
  engine: JordProjectEngine;
  target: string;
  tls_mode?: ProjectTlsMode | null;
  db_user?: string | null;
  password?: string | null;
  notes?: string;
};

export type PatchProjectBody = {
  notes?: string;
  status?: Extract<JordProjectStatus, "active">;
};

export type ProjectRegistryDeps = {
  jord: JordDriverPort;
  secrets: SecretPort | null;
  testConnect?: ProjectConnectTester;
  /** Open target and run migrations (default). Tests may no-op. */
  baseline?: (input: ProjectConnectInput) => Promise<void>;
  enqueueWrite: <T>(work: () => Promise<T>) => Promise<T>;
};

function requireSecretPort(secrets: SecretPort | null): SecretPort {
  if (!secrets) {
    throw new Error("JORD_MASTER_KEY is required for the project registry");
  }
  return secrets;
}

function ph(jord: JordDriverPort, n: number): string {
  return jord.dialect === "postgres" ? `$${n}` : "?";
}

function asAes(secrets: SecretPort): AesGcmSecretPort {
  if (typeof (secrets as AesGcmSecretPort).peekSealed !== "function") {
    throw new Error("secret port must support peekSealed for project registry");
  }
  return secrets as AesGcmSecretPort;
}

function secretId(projectId: string): string {
  return `project:${projectId}:db_password`;
}

export function validateSlug(slug: string): string | null {
  const trimmed = slug.trim();
  if (!trimmed) return "slug is required";
  if (trimmed.length > 64) return "slug must be at most 64 characters";
  if (!SLUG_RE.test(trimmed)) {
    return "slug must be lowercase alphanumeric with optional hyphens";
  }
  return null;
}

export function parseEngine(raw: unknown): JordProjectEngine | null {
  if (typeof raw !== "string") return null;
  return ENGINES.has(raw as JordProjectEngine)
    ? (raw as JordProjectEngine)
    : null;
}

export function parseTlsMode(raw: unknown): ProjectTlsMode | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null || raw === "") return null;
  if (typeof raw !== "string") return undefined;
  return TLS_MODES.has(raw as ProjectTlsMode)
    ? (raw as ProjectTlsMode)
    : undefined;
}

function mapProject(
  row: Record<string, unknown>,
  keys: ProjectKeyPublic[],
): ProjectPublic {
  const tls = row.tls_mode;
  return {
    id: String(row.id),
    slug: String(row.slug),
    engine: String(row.engine) as JordProjectEngine,
    target: String(row.target),
    tls_mode:
      tls == null || tls === ""
        ? null
        : (String(tls) as ProjectTlsMode),
    db_user: row.db_user == null ? null : String(row.db_user),
    notes: String(row.notes ?? ""),
    status: String(row.status) as JordProjectStatus,
    created_at: Number(row.created_at),
    archived_at: row.archived_at == null ? null : Number(row.archived_at),
    keys,
  };
}

function mapKey(row: Record<string, unknown>): ProjectKeyPublic {
  return {
    kind: String(row.kind),
    prefix: String(row.prefix),
    last4: String(row.last4),
    created_at: Number(row.created_at),
    rotated_at: row.rotated_at == null ? null : Number(row.rotated_at),
  };
}

async function loadKeys(
  jord: JordDriverPort,
  projectId: string,
): Promise<ProjectKeyPublic[]> {
  const rows = await jord.query(
    `SELECT kind, prefix, last4, created_at, rotated_at
     FROM jord_project_keys
     WHERE project_id = ${ph(jord, 1)}
     ORDER BY kind ASC`,
    [projectId],
  );
  return rows.map(mapKey);
}

function assertNoSecrets(json: unknown): void {
  const text = JSON.stringify(json);
  for (const needle of [
    "password",
    "secret_key",
    "db_password",
    "db_password_sealed",
    "key_hash",
  ]) {
    if (text.includes(`"${needle}"`)) {
      throw new Error(`response leaked credential field: ${needle}`);
    }
  }
}

export function publicProjectJson(project: ProjectPublic): ProjectPublic {
  assertNoSecrets(project);
  return project;
}

async function defaultBaseline(input: ProjectConnectInput): Promise<void> {
  let url: string;
  let authToken: string | undefined;
  if (input.engine === "libsql-file") {
    url = input.target.trim().startsWith("file:")
      ? input.target.trim()
      : fsPathToFileUrl(input.target.trim());
  } else if (input.engine === "libsql-turso") {
    url = input.target.trim();
    authToken = input.password?.trim() || undefined;
  } else {
    const parsed = new URL(input.target.trim());
    if (input.dbUser?.trim()) parsed.username = input.dbUser.trim();
    if (input.password != null) parsed.password = input.password;
    if (input.tlsMode === "disable") parsed.searchParams.set("sslmode", "disable");
    else if (input.tlsMode === "require") {
      parsed.searchParams.set("sslmode", "require");
    } else if (input.tlsMode === "verify-full") {
      parsed.searchParams.set("sslmode", "verify-full");
    }
    url = parsed.toString();
  }
  const client = await createJordClient({ url, authToken });
  await client.close();
}

async function insertKeys(
  jord: JordDriverPort,
  projectId: string,
  keys: {
    publishable: GeneratedProjectKey;
    secret: GeneratedProjectKey;
    barrier: GeneratedProjectKey;
  },
  now: number,
): Promise<void> {
  for (const key of [keys.publishable, keys.secret, keys.barrier]) {
    await jord.query(
      `INSERT INTO jord_project_keys
        (id, project_id, kind, key_hash, prefix, last4, created_at, rotated_at)
       VALUES (${ph(jord, 1)}, ${ph(jord, 2)}, ${ph(jord, 3)}, ${ph(jord, 4)},
               ${ph(jord, 5)}, ${ph(jord, 6)}, ${ph(jord, 7)}, NULL)`,
      [
        randomUUID(),
        projectId,
        key.kind,
        key.keyHash,
        key.prefix,
        key.last4,
        now,
      ],
    );
  }
}

export async function testProjectConnect(
  deps: Pick<ProjectRegistryDeps, "testConnect">,
  input: ProjectConnectInput,
): Promise<ProjectConnectResult> {
  const tester = deps.testConnect ?? defaultProjectConnectTest;
  return tester(input);
}

export async function listProjects(
  deps: ProjectRegistryDeps,
): Promise<ProjectPublic[]> {
  const rows = await deps.jord.query(
    `SELECT id, slug, engine, target, tls_mode, db_user, notes, status,
            created_at, archived_at
     FROM jord_projects
     ORDER BY created_at DESC`,
  );
  const out: ProjectPublic[] = [];
  for (const row of rows) {
    const keys = await loadKeys(deps.jord, String(row.id));
    out.push(publicProjectJson(mapProject(row, keys)));
  }
  return out;
}

export async function getProject(
  deps: ProjectRegistryDeps,
  id: string,
): Promise<
  | { ok: true; project: ProjectPublic }
  | { ok: false; status: 404 | 410; error: string; reason?: string }
> {
  const rows = await deps.jord.query(
    `SELECT id, slug, engine, target, tls_mode, db_user, notes, status,
            created_at, archived_at
     FROM jord_projects WHERE id = ${ph(deps.jord, 1)} LIMIT 1`,
    [id],
  );
  const row = rows[0];
  if (!row) return { ok: false, status: 404, error: "project_not_found" };
  if (String(row.status) === "archived") {
    return {
      ok: false,
      status: 410,
      error: "project_archived",
      reason: "project is archived; keys are revoked",
    };
  }
  const keys = await loadKeys(deps.jord, String(row.id));
  return { ok: true, project: publicProjectJson(mapProject(row, keys)) };
}

export async function createProject(
  deps: ProjectRegistryDeps,
  body: CreateProjectBody,
): Promise<
  | {
      ok: true;
      project: ProjectPublic;
      secret_key: string;
      publishable_key: string;
      barrier_key: string;
    }
  | { ok: false; status: 400 | 409 | 503; error: string; detail?: string }
> {
  if (!deps.secrets) {
    return { ok: false, status: 503, error: "master_key_required" };
  }
  const slugError = validateSlug(body.slug);
  if (slugError) return { ok: false, status: 400, error: slugError };
  if (!ENGINES.has(body.engine)) {
    return { ok: false, status: 400, error: "invalid_engine" };
  }
  const target = body.target?.trim() ?? "";
  if (!target) return { ok: false, status: 400, error: "target is required" };

  if (body.engine === "postgres") {
    if (
      !target.startsWith("postgres://") &&
      !target.startsWith("postgresql://")
    ) {
      return { ok: false, status: 400, error: "postgres target must be a URL" };
    }
  }
  if (body.engine === "libsql-turso" && !target.startsWith("libsql://")) {
    return {
      ok: false,
      status: 400,
      error: "libsql-turso target must be libsql://",
    };
  }

  const tlsMode = body.tls_mode ?? null;
  if (body.engine === "postgres" && tlsMode) {
    // already validated by caller parse
  } else if (body.engine !== "postgres" && tlsMode) {
    return {
      ok: false,
      status: 400,
      error: "tls_mode is only valid for postgres",
    };
  }

  const connectInput: ProjectConnectInput = {
    engine: body.engine,
    target,
    dbUser: body.db_user ?? null,
    password: body.password ?? null,
    tlsMode,
  };

  const ping = await testProjectConnect(deps, connectInput);
  if (!ping.ok) {
    return {
      ok: false,
      status: 400,
      error: "connect_failed",
      detail: ping.error,
    };
  }

  const baseline = deps.baseline ?? defaultBaseline;
  try {
    await baseline(connectInput);
  } catch (err) {
    return {
      ok: false,
      status: 400,
      error: "baseline_failed",
      detail: err instanceof Error ? err.message : String(err),
    };
  }

  const projectId = randomUUID();
  const now = Date.now();
  const keys = generateProjectKeySet();
  let sealed: string | null = null;
  if (body.password != null && body.password !== "") {
    const port = asAes(requireSecretPort(deps.secrets));
    await port.putSecret(secretId(projectId), body.password);
    sealed = port.peekSealed(secretId(projectId)) ?? null;
    if (!sealed) {
      return { ok: false, status: 503, error: "secret_seal_failed" };
    }
  }

  const notes = body.notes?.trim() ?? "";

  try {
    await deps.enqueueWrite(async () => {
      await deps.jord.query(
        `INSERT INTO jord_projects
          (id, slug, engine, target, tls_mode, db_user, db_password_sealed,
           notes, status, created_at, archived_at)
         VALUES (${ph(deps.jord, 1)}, ${ph(deps.jord, 2)}, ${ph(deps.jord, 3)},
                 ${ph(deps.jord, 4)}, ${ph(deps.jord, 5)}, ${ph(deps.jord, 6)},
                 ${ph(deps.jord, 7)}, ${ph(deps.jord, 8)}, 'active',
                 ${ph(deps.jord, 9)}, NULL)`,
        [
          projectId,
          body.slug.trim(),
          body.engine,
          target,
          tlsMode,
          body.db_user?.trim() || null,
          sealed,
          notes,
          now,
        ],
      );
      await insertKeys(deps.jord, projectId, keys, now);
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/unique|UNIQUE|duplicate/i.test(msg)) {
      return { ok: false, status: 409, error: "slug_taken" };
    }
    throw err;
  }

  const loaded = await getProject(deps, projectId);
  if (!loaded.ok) {
    return { ok: false, status: 503, error: "project_readback_failed" };
  }

  const response = {
    ok: true as const,
    project: loaded.project,
    secret_key: keys.secret.plaintext,
    publishable_key: keys.publishable.plaintext,
    barrier_key: keys.barrier.plaintext,
  };
  // Create response intentionally includes secret_key once; strip before leak check on project only.
  publicProjectJson(loaded.project);
  return response;
}

export async function patchProject(
  deps: ProjectRegistryDeps,
  id: string,
  body: PatchProjectBody,
): Promise<
  | { ok: true; project: ProjectPublic }
  | { ok: false; status: 400 | 404 | 410; error: string; reason?: string }
> {
  const existing = await getProject(deps, id);
  if (!existing.ok) return existing;

  const notes =
    body.notes !== undefined ? body.notes : existing.project.notes;
  if (body.status !== undefined && body.status !== "active") {
    return { ok: false, status: 400, error: "invalid_status" };
  }

  await deps.enqueueWrite(async () => {
    await deps.jord.query(
      `UPDATE jord_projects SET notes = ${ph(deps.jord, 1)}
       WHERE id = ${ph(deps.jord, 2)}`,
      [notes, id],
    );
  });

  return getProject(deps, id);
}

export async function archiveProject(
  deps: ProjectRegistryDeps,
  id: string,
): Promise<
  | { ok: true }
  | { ok: false; status: 404 | 410; error: string; reason?: string }
> {
  const rows = await deps.jord.query(
    `SELECT id, status FROM jord_projects WHERE id = ${ph(deps.jord, 1)} LIMIT 1`,
    [id],
  );
  const row = rows[0];
  if (!row) return { ok: false, status: 404, error: "project_not_found" };
  if (String(row.status) === "archived") {
    return {
      ok: false,
      status: 410,
      error: "project_archived",
      reason: "project is already archived",
    };
  }

  const now = Date.now();
  await deps.enqueueWrite(async () => {
    await deps.jord.query(
      `DELETE FROM jord_project_keys WHERE project_id = ${ph(deps.jord, 1)}`,
      [id],
    );
    await deps.jord.query(
      `UPDATE jord_projects
       SET status = 'archived', archived_at = ${ph(deps.jord, 1)},
           db_password_sealed = NULL
       WHERE id = ${ph(deps.jord, 2)}`,
      [now, id],
    );
  });

  return { ok: true };
}

export async function rotateProjectKeys(
  deps: ProjectRegistryDeps,
  id: string,
): Promise<
  | {
      ok: true;
      project: ProjectPublic;
      secret_key: string;
      publishable_key: string;
      barrier_key: string;
    }
  | { ok: false; status: 404 | 410; error: string; reason?: string }
> {
  const existing = await getProject(deps, id);
  if (!existing.ok) return existing;

  const keys = generateProjectKeySet();
  const now = Date.now();

  await deps.enqueueWrite(async () => {
    await deps.jord.query(
      `DELETE FROM jord_project_keys WHERE project_id = ${ph(deps.jord, 1)}`,
      [id],
    );
    await insertKeys(deps.jord, id, keys, now);
    // Mark rotation time on new rows via a second update for clarity in list.
    await deps.jord.query(
      `UPDATE jord_project_keys SET rotated_at = ${ph(deps.jord, 1)}
       WHERE project_id = ${ph(deps.jord, 2)}`,
      [now, id],
    );
  });

  const loaded = await getProject(deps, id);
  if (!loaded.ok) return loaded;

  return {
    ok: true,
    project: loaded.project,
    secret_key: keys.secret.plaintext,
    publishable_key: keys.publishable.plaintext,
    barrier_key: keys.barrier.plaintext,
  };
}
