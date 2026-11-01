"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Field,
  FieldInput,
  FieldTextarea,
  PasswordInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@altr/apolyx";

import { ProjectKeyReveal, type RevealedKeys } from "@/components/project-key-reveal";
import {
  type CreateProjectPayload,
  type ProjectEngine,
  type ProjectPublic,
  type ProjectTlsMode,
  slugifyName,
  validateSlugClient,
} from "@/lib/projects";

type Mode = "create" | "edit";

type Props = {
  mode: Mode;
  role: string;
  /** Required for edit mode */
  project?: ProjectPublic;
};

type ConnectState =
  | { status: "idle" }
  | { status: "ok"; latencyMs: number }
  | { status: "fail"; error: string; latencyMs: number };

const ENGINES: { value: ProjectEngine; label: string }[] = [
  { value: "libsql-file", label: "libSQL file" },
  { value: "libsql-turso", label: "libSQL Turso" },
  { value: "postgres", label: "Postgres" },
];

const TLS_MODES: { value: ProjectTlsMode; label: string }[] = [
  { value: "disable", label: "Disable" },
  { value: "require", label: "Require" },
  { value: "verify-full", label: "Verify full" },
];

function targetPlaceholder(engine: ProjectEngine): string {
  switch (engine) {
    case "libsql-file":
      return "file:./data/my-project.db or absolute path";
    case "libsql-turso":
      return "libsql://your-db.turso.io";
    case "postgres":
      return "postgres://host:5432/dbname";
  }
}

export function ProjectForm({ mode, role, project }: Props) {
  const router = useRouter();
  const [name, setName] = useState(project?.slug ?? "");
  const [slug, setSlug] = useState(project?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [engine, setEngine] = useState<ProjectEngine>(
    project?.engine ?? "libsql-file",
  );
  const [target, setTarget] = useState(project?.target ?? "");
  const [tlsMode, setTlsMode] = useState<ProjectTlsMode>(
    project?.tls_mode ?? "require",
  );
  const [dbUser, setDbUser] = useState(project?.db_user ?? "");
  const [password, setPassword] = useState("");
  const [notes, setNotes] = useState(project?.notes ?? "");
  const [connect, setConnect] = useState<ConnectState>({ status: "idle" });
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<{
    project: ProjectPublic;
    keys: RevealedKeys;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (mode === "edit" || slugTouched) return;
    setSlug(slugifyName(name));
  }, [name, mode, slugTouched]);

  if (role !== "admin") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Alert variant="warning">
          <AlertTitle>Admin only</AlertTitle>
          <AlertDescription>
            Project provisioning is limited to operator admin sessions.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (revealed) {
    return (
      <ProjectKeyReveal
        project={revealed.project}
        keys={revealed.keys}
        title={
          mode === "edit"
            ? "New keys — store them now"
            : "Project created — store these keys"
        }
        onDismiss={() => {
          router.push(`/p/${encodeURIComponent(revealed.project.slug)}`);
        }}
      />
    );
  }

  const isPostgres = engine === "postgres";
  const isCreate = mode === "create";
  const connectBlocksSubmit =
    isCreate && connect.status !== "ok";

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (isCreate) {
      if (!name.trim()) next.name = "Name is required";
      const slugErr = validateSlugClient(slug);
      if (slugErr) next.slug = slugErr;
      if (!target.trim()) next.target = "Target is required";
      if (engine === "libsql-turso" && !target.trim().startsWith("libsql://")) {
        next.target = "Turso target must start with libsql://";
      }
      if (
        engine === "postgres" &&
        !target.trim().startsWith("postgres://") &&
        !target.trim().startsWith("postgresql://")
      ) {
        next.target = "Postgres target must be a postgres:// URL";
      }
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  function buildConnectBody(): CreateProjectPayload {
    return {
      slug: slug.trim(),
      engine,
      target: target.trim(),
      tls_mode: isPostgres ? tlsMode : null,
      db_user: isPostgres ? dbUser.trim() || null : null,
      password: password || null,
      notes: notes.trim(),
    };
  }

  function runTest() {
    if (!validate()) return;
    setFormError(null);
    startTransition(async () => {
      const started = performance.now();
      const body = buildConnectBody();
      const res = await fetch("/api/admin/projects/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          engine: body.engine,
          target: body.target,
          tls_mode: body.tls_mode,
          db_user: body.db_user,
          password: body.password,
        }),
      });
      const latencyMs = Math.round(performance.now() - started);
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: string;
      };
      if (!res.ok || json.ok === false) {
        setConnect({
          status: "fail",
          error: json.error ?? json.message ?? `Connect failed (${res.status})`,
          latencyMs,
        });
        return;
      }
      setConnect({ status: "ok", latencyMs });
    });
  }

  function runCreate() {
    if (!validate()) return;
    if (connect.status !== "ok") {
      setFormError("Test the connection successfully before creating.");
      return;
    }
    setFormError(null);
    startTransition(async () => {
      const body = buildConnectBody();
      const res = await fetch("/api/admin/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as {
        project?: ProjectPublic;
        secret_key?: string;
        publishable_key?: string;
        barrier_key?: string;
        error?: string;
        detail?: string;
        message?: string;
      };
      if (!res.ok || !json.project || !json.secret_key) {
        const msg =
          json.detail ??
          json.error ??
          json.message ??
          `Create failed (${res.status})`;
        setFormError(msg);
        if (json.error === "connect_failed" && json.detail) {
          setConnect({
            status: "fail",
            error: json.detail,
            latencyMs: 0,
          });
        }
        return;
      }
      setRevealed({
        project: json.project,
        keys: {
          secret_key: json.secret_key,
          publishable_key: json.publishable_key ?? "",
          barrier_key: json.barrier_key ?? "",
        },
      });
    });
  }

  function runSaveNotes() {
    if (!project) return;
    setFormError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/projects/${encodeURIComponent(project.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ notes: notes.trim() }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        project?: ProjectPublic;
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        setFormError(json.error ?? json.message ?? `Save failed (${res.status})`);
        return;
      }
      router.push("/projects");
      router.refresh();
    });
  }

  function runRotateKeys() {
    if (!project) return;
    setFormError(null);
    startTransition(async () => {
      const res = await fetch(
        `/api/admin/projects/${encodeURIComponent(project.id)}/rotate-keys`,
        { method: "POST" },
      );
      const json = (await res.json().catch(() => ({}))) as {
        project?: ProjectPublic;
        secret_key?: string;
        publishable_key?: string;
        barrier_key?: string;
        error?: string;
        message?: string;
      };
      if (!res.ok || !json.project || !json.secret_key) {
        setFormError(
          json.error ?? json.message ?? `Rotate failed (${res.status})`,
        );
        return;
      }
      setRevealed({
        project: json.project,
        keys: {
          secret_key: json.secret_key,
          publishable_key: json.publishable_key ?? "",
          barrier_key: json.barrier_key ?? "",
        },
      });
    });
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Projects
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {isCreate ? "New project" : `Edit · ${project?.slug}`}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isCreate
            ? "Register a database target, test the connection, then create. Secrets never land in the URL or localStorage."
            : "Update notes or rotate API keys. Database password rotation is write-only via create; target fields stay read-only here."}
        </p>
      </div>

      {formError ? (
        <Alert variant="destructive">
          <AlertTitle>Could not save</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      {isCreate ? (
        <>
          <Field label="Name" error={fieldErrors.name} required>
            <FieldInput
              name="name"
              autoComplete="off"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My analytics DB"
            />
          </Field>

          <Field
            label="Slug"
            description="Immutable after create. Used in routes and keys."
            error={fieldErrors.slug}
            required
          >
            <FieldInput
              name="slug"
              autoComplete="off"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
                setConnect({ status: "idle" });
              }}
              className="font-mono"
              placeholder="my-analytics-db"
            />
          </Field>

          <Field label="Engine" required>
            <Select
              value={engine}
              onValueChange={(v) => {
                setEngine(v as ProjectEngine);
                setConnect({ status: "idle" });
              }}
            >
              <SelectTrigger aria-label="Engine">
                <SelectValue placeholder="Pick engine" />
              </SelectTrigger>
              <SelectContent>
                {ENGINES.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            label="Target"
            error={fieldErrors.target}
            required
            description={
              engine === "libsql-turso"
                ? "Hosted libSQL URL. Auth token goes in the password field."
                : undefined
            }
          >
            <FieldInput
              name="target"
              autoComplete="off"
              value={target}
              onChange={(e) => {
                setTarget(e.target.value);
                setConnect({ status: "idle" });
              }}
              className="font-mono text-sm"
              placeholder={targetPlaceholder(engine)}
            />
          </Field>

          {isPostgres ? (
            <>
              <Field label="TLS mode">
                <Select
                  value={tlsMode}
                  onValueChange={(v) => {
                    setTlsMode(v as ProjectTlsMode);
                    setConnect({ status: "idle" });
                  }}
                >
                  <SelectTrigger aria-label="TLS mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TLS_MODES.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="DB user" optional>
                <FieldInput
                  name="db_user"
                  autoComplete="off"
                  value={dbUser}
                  onChange={(e) => {
                    setDbUser(e.target.value);
                    setConnect({ status: "idle" });
                  }}
                />
              </Field>
            </>
          ) : null}

          <Field
            label={
              engine === "libsql-turso" ? "Auth token" : "DB password"
            }
            description="Write-only. Never returned by list or detail."
            optional={engine === "libsql-file"}
          >
            <PasswordInput
              name="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setConnect({ status: "idle" });
              }}
            />
          </Field>
        </>
      ) : (
        <Alert variant="info">
          <AlertTitle>
            {project?.engine} · {project?.target}
          </AlertTitle>
          <AlertDescription>
            Connection target is fixed after create. Archive and re-register to
            point at a different database.
          </AlertDescription>
        </Alert>
      )}

      <Field label="Notes" optional>
        <FieldTextarea
          name="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Region, owner, or ops notes"
        />
      </Field>

      {isCreate ? (
        <>
          {connect.status === "ok" ? (
            <Alert variant="success">
              <AlertTitle>Connection ok</AlertTitle>
              <AlertDescription>
                Ping succeeded in {connect.latencyMs} ms. You can create the
                project.
              </AlertDescription>
            </Alert>
          ) : null}
          {connect.status === "fail" ? (
            <Alert variant="destructive">
              <AlertTitle>Connection failed</AlertTitle>
              <AlertDescription>{connect.error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="secondary"
              disabled={isPending}
              onClick={runTest}
            >
              Test connection
            </Button>
            <Button
              type="button"
              disabled={isPending || connectBlocksSubmit}
              onClick={runCreate}
            >
              Create project
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap gap-3">
          <Button type="button" disabled={isPending} onClick={runSaveNotes}>
            Save notes
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={runRotateKeys}
          >
            Rotate API keys
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/projects")}>
            Back to list
          </Button>
        </div>
      )}
    </div>
  );
}
