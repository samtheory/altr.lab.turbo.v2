"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxTrigger,
  Field,
  FieldInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@altr/apolyx";
import { CircleAlert, ShieldCheck, ShieldX } from "lucide-react";

import { useInspectorOptional } from "@/components/inspector-host";
import type { AuthAdminUser } from "@/lib/studio-auth-users";
import type { SchemaTable } from "@/lib/schema";
import { parseStudioErrorText } from "@/lib/studio-api";
import {
  buildEvaluateRequest,
  describeTesterError,
  historyLabel,
  parseClaimsOverride,
  pushHistory,
  normalizeEvaluateResult,
  reasonText,
  RESERVED_CLAIMS,
  rowScopeTermText,
  userStatusNotices,
  TESTER_OPERATIONS,
  type EvaluateRequest,
  type EvaluateResult,
  type HistoryEntry,
  type MatchedPolicy,
  type TesterError,
  type TesterOperation,
} from "@/lib/studio-policy-tester";

const ANON = "__anonymous__";

type Props = {
  /** Pre-selected table (opened from a table's policy drawer). */
  table?: string;
  schema?: string;
  /** Open the matched policy in the host editor; falls back to the inspector. */
  onEditPolicy?: (policyId: string) => void;
};

type RunState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "error"; error: TesterError }
  | { status: "done"; result: EvaluateResult };

type UsersState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; users: AuthAdminUser[] };

export function PolicyTester({ table: tableProp, schema: schemaProp, onEditPolicy }: Props) {
  const inspector = useInspectorOptional();
  const [users, setUsers] = useState<UsersState>({ status: "loading" });
  const [tables, setTables] = useState<string[]>([]);
  const [principal, setPrincipal] = useState<string>(ANON);
  const [claimsText, setClaimsText] = useState("");
  const [operation, setOperation] = useState<TesterOperation>("select");
  const [table, setTable] = useState(tableProp ?? "");
  const [pkCols, setPkCols] = useState<Array<{ name: string; numeric: boolean }>>([]);
  const [pk, setPk] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [run, setRun] = useState<RunState>({ status: "idle" });
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const resultRef = useRef<HTMLDivElement>(null);
  const lastRequest = useRef<EvaluateRequest | null>(null);
  const schema = schemaProp ?? "";

  const loadUsers = useCallback(async () => {
    setUsers({ status: "loading" });
    try {
      const res = await fetch("/api/admin/auth/users", { cache: "no-store" });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          parseStudioErrorText(text, res.status) ?? `Failed to load users (${res.status})`,
        );
      }
      const body = (await res.json()) as { users?: AuthAdminUser[] };
      setUsers({ status: "ready", users: body.users ?? [] });
    } catch (err) {
      setUsers({
        status: "error",
        message: err instanceof Error ? err.message : "Failed to load users",
      });
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    let cancelled = false;
    const qs = schema ? `?schema=${encodeURIComponent(schema)}` : "";
    void fetch(`/api/schema/tables${qs}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { tables?: string[] } | null) => {
        if (cancelled || !body?.tables) return;
        setTables(body.tables);
        setTable((prev) => prev || body.tables![0] || "");
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [schema]);

  useEffect(() => {
    if (!table) {
      setPkCols([]);
      return;
    }
    let cancelled = false;
    const qs = schema ? `?schema=${encodeURIComponent(schema)}` : "";
    void fetch(`/api/schema/tables/${encodeURIComponent(table)}${qs}`, {
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: SchemaTable | null) => {
        if (cancelled) return;
        const cols = (body?.columns ?? [])
          .filter((c) => c.pk)
          .map((c) => ({ name: c.name, numeric: /int|real|num|float|double/i.test(c.type) }));
        setPkCols(cols);
        setPk({});
      })
      .catch(() => {
        if (!cancelled) setPkCols([]);
      });
    return () => {
      cancelled = true;
    };
  }, [table, schema]);

  const userList = users.status === "ready" ? users.users : [];
  const claims = useMemo(() => parseClaimsOverride(claimsText), [claimsText]);
  const tableOptions = useMemo(
    () => (table && !tables.includes(table) ? [table, ...tables] : tables),
    [tables, table],
  );

  const principalLabel = useCallback(
    (id: string | null) =>
      id == null
        ? "Anonymous"
        : (userList.find((u) => u.id === id)?.email ?? id),
    [userList],
  );

  const execute = useCallback(
    async (req: EvaluateRequest) => {
      lastRequest.current = req;
      setRun({ status: "running" });
      try {
        const res = await fetch("/api/admin/policies/evaluate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(req),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          setRun({
            status: "error",
            error: describeTesterError(res.status, parseStudioErrorText(text) ?? undefined),
          });
        } else {
          const result = normalizeEvaluateResult((await res.json()) as EvaluateResult);
          setRun({ status: "done", result });
          setHistory((h) =>
            pushHistory(h, {
              id: `${Date.now()}-${h.length}`,
              at: Date.now(),
              label: historyLabel(req, principalLabel(req.principalId ?? null)),
              allowed: result.allowed,
              hypotheticalAllowed: result.hypothetical ? result.hypothetical.allowed : null,
              request: req,
            }),
          );
        }
      } catch {
        setRun({ status: "error", error: describeTesterError(0) });
      }
      requestAnimationFrame(() => resultRef.current?.focus());
    },
    [principalLabel],
  );

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (run.status === "running") return;
    const built = buildEvaluateRequest({
      principalId: principal === ANON ? null : principal,
      claimsText,
      operation,
      table,
      schema,
      pk,
      pkNumeric: Object.fromEntries(pkCols.map((c) => [c.name, c.numeric])),
    });
    if (!built.ok) {
      setFormErrors(built.errors);
      return;
    }
    setFormErrors([]);
    void execute(built.body);
  }

  function editPolicy(id: string) {
    if (onEditPolicy) onEditPolicy(id);
    else inspector?.open("policies", { table, ...(schema ? { schema } : {}) });
  }

  const running = run.status === "running";

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={submit} className="flex flex-col gap-3" aria-label="Policy tester">
        <Field label="Run as">
          <Combobox value={principal} onValueChange={setPrincipal}>
            <ComboboxTrigger aria-label="Principal" placeholder="Search users…" />
            <ComboboxContent>
              <ComboboxItem value={ANON} textValue="Anonymous">
                Anonymous (no session)
              </ComboboxItem>
              {userList.map((u) => (
                <ComboboxItem key={u.id} value={u.id} textValue={`${u.email} ${u.id}`}>
                  {u.email}
                </ComboboxItem>
              ))}
              <ComboboxEmpty>No matching users</ComboboxEmpty>
            </ComboboxContent>
          </Combobox>
        </Field>
        {users.status === "loading" ? (
          <p className="text-xs text-muted-foreground">Loading users…</p>
        ) : null}
        {users.status === "error" ? (
          <Alert variant="destructive">
            <AlertTitle>Could not load users</AlertTitle>
            <AlertDescription>
              {users.message}{" "}
              <button type="button" className="underline" onClick={() => void loadUsers()}>
                Retry
              </button>
            </AlertDescription>
          </Alert>
        ) : null}
        {users.status === "ready" && userList.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No users yet. You can still test as Anonymous.
          </p>
        ) : null}

        <Field
          label="Hypothetical claims (optional JSON)"
          description={`Advisory only. Production tokens carry just sub, email and session id, so custom claims never reach policies in real requests; they only drive the "If a token carried these claims" card. Reserved claims (${RESERVED_CLAIMS.join(", ")}) are set by the server and ignored.`}
          error={claims.ok ? undefined : claims.error}
        >
          <Textarea
            aria-label="Hypothetical claims JSON"
            className="min-h-16 font-mono text-xs"
            placeholder='{"plan": "pro"}'
            spellCheck={false}
            value={claimsText}
            onChange={(e) => setClaimsText(e.target.value)}
          />
        </Field>
        {claims.ok && claims.ignored.length > 0 ? (
          <p className="text-xs text-muted-foreground" role="status">
            Ignored reserved claims:{" "}
            {claims.ignored.map((k) => (
              <code key={k} className="mr-1 font-mono">
                {k}
              </code>
            ))}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Table">
            <Combobox value={table} onValueChange={setTable}>
              <ComboboxTrigger aria-label="Table" placeholder="Search table…" />
              <ComboboxContent>
                {tableOptions.map((t) => (
                  <ComboboxItem key={t} value={t}>
                    {t}
                  </ComboboxItem>
                ))}
                <ComboboxEmpty>No tables</ComboboxEmpty>
              </ComboboxContent>
            </Combobox>
          </Field>
          <Field label="Operation">
            <Select value={operation} onValueChange={(v) => setOperation(v as TesterOperation)}>
              <SelectTrigger aria-label="Operation">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TESTER_OPERATIONS.map((op) => (
                  <SelectItem key={op} value={op}>
                    {op}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <fieldset className="flex flex-col gap-2 border-0 p-0">
          <legend className="mb-1 text-sm font-medium">Row</legend>
          {pkCols.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Any row (this table has no primary key to pick by).
            </p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Leave blank for any row, or enter the primary key to test one row.
              </p>
              {pkCols.map((c) => (
                <Field key={c.name} label={c.name}>
                  <FieldInput
                    inputMode={c.numeric ? "numeric" : undefined}
                    value={pk[c.name] ?? ""}
                    onChange={(e) => setPk((p) => ({ ...p, [c.name]: e.target.value }))}
                    placeholder="any"
                  />
                </Field>
              ))}
            </>
          )}
        </fieldset>

        {formErrors.length > 0 ? (
          <Alert variant="destructive" role="alert">
            <AlertTitle>Fix the form</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-4">
                {formErrors.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={running || !claims.ok || !table}>
            {running ? "Running…" : "Run test"}
          </Button>
          <span className="text-xs text-muted-foreground">Enter submits</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Results come from the production policy evaluator. Every test is audited.
        </p>
      </form>

      <div
        ref={resultRef}
        tabIndex={-1}
        aria-live="polite"
        aria-label="Test result"
        className="flex flex-col gap-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {run.status === "running" ? (
          <p className="text-sm text-muted-foreground">Evaluating…</p>
        ) : null}
        {run.status === "error" ? (
          <Alert variant="destructive">
            <AlertTitle>
              {run.error.title}
              {run.error.status ? ` (${run.error.status})` : ""}
            </AlertTitle>
            <AlertDescription>
              <p>{run.error.message}</p>
              {run.error.retryable && lastRequest.current ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => void execute(lastRequest.current!)}
                >
                  Retry
                </Button>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}
        {run.status === "done" ? (
          <ResultView result={run.result} onEditPolicy={editPolicy} />
        ) : null}
      </div>

      {history.length > 0 ? (
        <section aria-label="Recent tests" className="flex flex-col gap-1">
          <h3 className="text-sm font-medium">Recent tests (this session)</h3>
          <ul className="flex flex-col gap-1">
            {history.map((h) => (
              <li
                key={h.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1"
              >
                <span className="min-w-0 truncate text-xs">
                  <Badge variant={h.allowed ? "success" : "destructive"} className="mr-2 text-[10px]">
                    {h.allowed ? "Allowed" : "Denied"}
                  </Badge>
                  {h.hypotheticalAllowed != null ? (
                    <Badge
                      variant="outline"
                      className="mr-2 text-[10px] text-muted-foreground"
                      title="Verdict if a token carried the typed claims"
                    >
                      If claims: {h.hypotheticalAllowed ? "Allowed" : "Denied"}
                    </Badge>
                  ) : null}
                  {h.label}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={running}
                  onClick={() => void execute(h.request)}
                  aria-label={`Re-run ${h.label}`}
                >
                  Re-run
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}


function PolicyBlock({
  p,
  onEditPolicy,
}: {
  p: MatchedPolicy | null;
  onEditPolicy?: (id: string) => void;
}) {
  if (!p) {
    return (
      <p className="flex items-center gap-1 text-sm text-muted-foreground">
        <CircleAlert className="size-4" aria-hidden /> No policy matched.
      </p>
    );
  }
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{p.name ?? p.id}</span>
        <Badge variant={p.effect === "allow" ? "success" : "destructive"} className="text-[10px]">
          {p.effect}
        </Badge>
        <Badge variant="outline" className="text-[10px]">
          {p.kind}
        </Badge>
      </div>
      <pre className="overflow-auto rounded border border-border bg-muted/30 p-2 font-mono text-xs">
        <code>{p.expression}</code>
      </pre>
      <p className="text-sm">{p.plainLanguage}</p>
      {onEditPolicy ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="self-start"
          onClick={() => onEditPolicy(p.id)}
        >
          Edit policy
        </Button>
      ) : null}
    </>
  );
}

function rowAllowedText(v: boolean | null): string {
  return v == null ? "n/a (any row)" : v ? "allowed" : "not allowed";
}

function ResultView({
  result,
  onEditPolicy,
}: {
  result: EvaluateResult;
  onEditPolicy: (id: string) => void;
}) {
  const notices = userStatusNotices(result.principal.userStatus);
  const ignored = result.ignoredClaims ?? [];
  const hyp = result.hypothetical ?? null;
  const scope = result.rowScope ?? null;
  return (
    <div className="flex flex-col gap-3">
      {notices.map((n) => (
        <Alert
          key={n.text}
          variant={n.level === "error" ? "destructive" : n.level}
          role={n.level === "info" ? "status" : "alert"}
        >
          <AlertDescription>{n.text}</AlertDescription>
        </Alert>
      ))}
      {ignored.length > 0 ? (
        <Alert variant="warning" role="status">
          <AlertDescription>
            Ignored by production:{" "}
            {ignored.map((k) => (
              <code key={k} className="mr-1 font-mono">
                {k}
              </code>
            ))}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-3 rounded-md border border-border p-3">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          With a real token
        </h3>
        <div className="flex items-center gap-2">
          {result.allowed ? (
            <ShieldCheck className="size-6 text-success" aria-hidden />
          ) : (
            <ShieldX className="size-6 text-destructive" aria-hidden />
          )}
          <Badge variant={result.allowed ? "success" : "destructive"} className="px-3 py-1 text-base">
            {result.allowed ? "ALLOWED" : "DENIED"}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {result.operation} on <code className="font-mono">{result.table}</code>
          </span>
        </div>
        <p className="text-sm">{reasonText(result.reason)}</p>

        <section aria-label="Matched policy" className="flex flex-col gap-1">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Matched policy
          </h3>
          <PolicyBlock p={result.matchedPolicy} onEditPolicy={onEditPolicy} />
        </section>

        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Rows evaluated</dt>
          <dd>{result.rowsEvaluated}</dd>
          <dt className="text-muted-foreground">Row count</dt>
          <dd>{result.rowCount ?? "n/a"}</dd>
          <dt className="text-muted-foreground">Chosen row</dt>
          <dd>{rowAllowedText(result.rowAllowed)}</dd>
          <dt className="text-muted-foreground">Row scope</dt>
          <dd>
            {scope && scope.anyOf.length > 0 ? (
              <>
                <ul className="flex flex-col gap-0.5">
                  {scope.anyOf.map((t, i) => (
                    <li key={`${t.column}-${i}`} className="font-mono text-xs">
                      {i > 0 ? <span className="mr-1 text-muted-foreground">OR</span> : null}
                      {rowScopeTermText(t)}
                    </li>
                  ))}
                </ul>
                {scope.lossy ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Partial: this scope is a simplified view of the policy and may not list every
                    condition.
                  </p>
                ) : null}
              </>
            ) : (
              "none"
            )}
          </dd>
        </dl>
        {result.countsIgnoreNativeRls ? (
          <p className="text-xs text-muted-foreground">
            Counts do not account for Postgres native row-level security.
          </p>
        ) : null}

        <section aria-label="Simulated principal" className="flex flex-col gap-1">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Principal as simulated
          </h3>
          <p className="text-sm">
            {result.principal.kind}
            {result.principal.uid ? (
              <>
                {" "}
                <code className="font-mono text-xs">{result.principal.uid}</code>
              </>
            ) : null}
          </p>
          <pre className="max-h-40 overflow-auto rounded border border-border bg-muted/30 p-2 font-mono text-xs">
            {JSON.stringify(result.principal.claims, null, 2)}
          </pre>
        </section>
      </div>

      {hyp ? (
        <section
          aria-label="Hypothetical result"
          className="flex flex-col gap-2 rounded-md border border-dashed border-border bg-muted/20 p-3 text-muted-foreground"
        >
          <h3 className="text-xs font-medium uppercase tracking-wide">
            If a token carried these claims
          </h3>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {hyp.allowed ? "Would be allowed" : "Would be denied"}
            </Badge>
            <span className="text-xs">{reasonText(hyp.reason)}</span>
          </div>
          <PolicyBlock p={hyp.matchedPolicy} />
          <p className="text-xs">
            Row count: {hyp.rowCount ?? "n/a"} · Chosen row: {rowAllowedText(hyp.rowAllowed)}
          </p>
          {result.hypotheticalNote ? (
            <p className="text-xs italic">{result.hypotheticalNote}</p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
