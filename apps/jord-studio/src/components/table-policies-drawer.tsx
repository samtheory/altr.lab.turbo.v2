"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Field,
  FieldInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "@altr/apolyx";

import { InspectorFooter } from "@/components/inspector-chrome";
import { PolicyTester } from "@/components/policy-tester";
import { useInspectorOptional } from "@/components/inspector-host";
import { useProjectHref } from "@/hooks/use-project-path";
import { canAlterSchema, type JordRole } from "@/lib/auth/roles";
import {
  BUILTIN_POLICY_RULE_KINDS,
  POLICY_EFFECTS,
  POLICY_OPERATIONS,
  type PublicPolicy,
} from "@/lib/database-api";
import { emitPoliciesChanged } from "@/lib/studio-table-apis";
import {
  buildAffectedRowsQuery,
  defaultRuleDraft,
  parsePolicyRules,
  serializePolicyRules,
  summarizePolicyRules,
  type PolicyRuleDraft,
} from "@/lib/studio-table-policies";

type ApiError = { error?: string; message?: string };

type Props = {
  role: JordRole;
  table: string;
  schema: string;
  columns?: string[];
};

type PreviewState = {
  count: number | null;
  rows: Array<Record<string, unknown>>;
  note: string;
  status: number;
};

export function TablePoliciesDrawer({
  role,
  table,
  schema,
  columns = [],
}: Props) {
  const canManage = canAlterSchema(role);
  const hrefFor = useProjectHref();
  const inspector = useInspectorOptional();
  const [rows, setRows] = useState<PublicPolicy[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"list" | "create" | "edit" | "test">("list");
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [previewValue, setPreviewValue] = useState("");

  const [name, setName] = useState(`Allow user select on ${table}`);
  const [operation, setOperation] = useState<string>("select");
  const [effect, setEffect] = useState<string>("allow");
  const [priority, setPriority] = useState("10");
  const [enabled, setEnabled] = useState(true);
  const [draftRules, setDraftRules] = useState<PolicyRuleDraft[]>([
    defaultRuleDraft("role_in"),
  ]);

  const selected = rows?.find((r) => r.id === selectedId) ?? null;

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/policies", { cache: "no-store" });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as ApiError;
      throw new Error(
        body.message ??
          (res.status === 503
            ? "jord-server is down — start `pnpm dev:jord`."
            : `Failed to load policies (${res.status}).`),
      );
    }
    const data = (await res.json()) as { policies: PublicPolicy[] };
    const forTable = data.policies.filter((p) => p.table_name === table);
    setRows(forTable);
    return forTable;
  }, [table]);

  useEffect(() => {
    let cancelled = false;
    startTransition(async () => {
      try {
        await load();
      } catch (err) {
        if (!cancelled) {
          setRows(null);
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  function beginCreate() {
    setMode("create");
    setSelectedId(null);
    setName(`Allow user select on ${table}`);
    setOperation("select");
    setEffect("allow");
    setPriority("10");
    setEnabled(true);
    setDraftRules([defaultRuleDraft("role_in")]);
    setPreview(null);
  }

  function beginEdit(row: PublicPolicy) {
    setMode("edit");
    setSelectedId(row.id);
    setName(row.name);
    setOperation(row.operation);
    setEffect(row.effect);
    setPriority(String(row.priority));
    setEnabled(row.enabled);
    setDraftRules(
      parsePolicyRules(row.rules).length > 0
        ? parsePolicyRules(row.rules)
        : [defaultRuleDraft("role_in")],
    );
    setPreview(null);
  }

  function save() {
    startTransition(async () => {
      try {
        setError(null);
        const rules = serializePolicyRules(draftRules);
        if (mode === "create") {
          const res = await fetch("/api/policies", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              name,
              table_name: table,
              operation,
              effect,
              priority: Number(priority) || 0,
              rules,
              enabled,
            }),
          });
          if (!res.ok) {
            const body = (await res.json().catch(() => ({}))) as ApiError;
            throw new Error(body.message ?? `Create failed (${res.status})`);
          }
        } else if (selected) {
          const res = await fetch(`/api/policies/${selected.id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              name,
              operation,
              effect,
              priority: Number(priority) || 0,
              rules,
              enabled,
            }),
          });
          if (!res.ok) {
            const body = (await res.json().catch(() => ({}))) as ApiError;
            throw new Error(body.message ?? `Save failed (${res.status})`);
          }
        }
        emitPoliciesChanged(table);
        await load();
        setMode("list");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      }
    });
  }

  function removeSelected() {
    if (!selected) return;
    startTransition(async () => {
      try {
        setError(null);
        const res = await fetch(`/api/policies/${selected.id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as ApiError;
          throw new Error(body.message ?? `Delete failed (${res.status})`);
        }
        setConfirmDelete(false);
        setSelectedId(null);
        setMode("list");
        emitPoliciesChanged(table);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed");
      }
    });
  }

  function runPreview() {
    startTransition(async () => {
      try {
        setError(null);
        const rules = serializePolicyRules(draftRules);
        const { pathQuery, note } = buildAffectedRowsQuery({
          schema,
          rulesJson: rules,
          previewValue,
          limit: 5,
        });
        const res = await fetch(
          `/api/v1/${encodeURIComponent(table)}?${pathQuery}`,
          { cache: "no-store" },
        );
        const text = await res.text();
        let count: number | null = null;
        let previewRows: Array<Record<string, unknown>> = [];
        try {
          const json = JSON.parse(text) as {
            data?: Array<Record<string, unknown>>;
            count?: number | null;
            rows?: Array<Record<string, unknown>>;
          };
          previewRows = json.data ?? json.rows ?? [];
          count =
            typeof json.count === "number"
              ? json.count
              : Array.isArray(previewRows)
                ? previewRows.length
                : null;
        } catch {
          previewRows = [];
        }
        setPreview({
          count,
          rows: previewRows.slice(0, 5),
          note,
          status: res.status,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Preview failed");
      }
    });
  }

  function updateRule(index: number, next: PolicyRuleDraft) {
    setDraftRules((prev) => prev.map((r, i) => (i === index ? next : r)));
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-col gap-4 px-4 py-4">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            Policies for{" "}
            <code className="font-mono">
              {schema !== "public" && schema !== "main"
                ? `${schema}.${table}`
                : table}
            </code>
          </p>
          <Link
            href={hrefFor("/database/policies")}
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            Open Database → Policies
          </Link>
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {mode === "test" ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="self-start"
              onClick={() => setMode("list")}
            >
              Back to policies
            </Button>
            <PolicyTester
              table={table}
              schema={schema}
              onEditPolicy={(id) => {
                const row = rows?.find((r) => r.id === id);
                if (row) beginEdit(row);
                else setMode("list");
              }}
            />
          </>
        ) : null}

        {mode === "list" ? (
          <>
            <div className="flex flex-wrap gap-2">
              {canManage ? (
                <Button type="button" size="sm" onClick={beginCreate}>
                  New policy
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  inspector?.open("apis", { table, schema })
                }
              >
                Open APIs
              </Button>
              {canManage ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setMode("test")}
                >
                  Test policy
                </Button>
              ) : null}
            </div>

            {rows === null && !error ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : null}
            {rows && rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No policies for this table yet.
              </p>
            ) : null}

            <ul className="flex flex-col gap-2">
              {(rows ?? []).map((row) => {
                const summary = summarizePolicyRules(row.rules);
                return (
                  <li
                    key={row.id}
                    className="rounded-md border border-border bg-muted/20 px-3 py-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => beginEdit(row)}
                      >
                        <p className="truncate text-sm font-medium">{row.name}</p>
                        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                          {summary.text}
                        </p>
                      </button>
                      <Switch
                        checked={row.enabled}
                        disabled={!canManage || isPending}
                        onCheckedChange={(v) => {
                          startTransition(async () => {
                            try {
                              const res = await fetch(
                                `/api/policies/${row.id}`,
                                {
                                  method: "PATCH",
                                  headers: {
                                    "content-type": "application/json",
                                  },
                                  body: JSON.stringify({ enabled: v }),
                                },
                              );
                              if (!res.ok) {
                                const body = (await res
                                  .json()
                                  .catch(() => ({}))) as ApiError;
                                throw new Error(
                                  body.message ??
                                    `Update failed (${res.status})`,
                                );
                              }
                              emitPoliciesChanged(table);
                              await load();
                            } catch (err) {
                              setError(
                                err instanceof Error
                                  ? err.message
                                  : "Update failed",
                              );
                            }
                          });
                        }}
                        aria-label={`Enable ${row.name}`}
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-[10px]">
                        {row.operation}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {row.effect}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        p{row.priority}
                      </Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        ) : mode !== "test" ? (
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="self-start"
              onClick={() => {
                setMode("list");
                setPreview(null);
              }}
            >
              ← Back
            </Button>
            <Field label="Name">
              <FieldInput
                value={name}
                disabled={!canManage}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label="Operation">
              <Select
                value={operation}
                onValueChange={setOperation}
                disabled={!canManage}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POLICY_OPERATIONS.map((op) => (
                    <SelectItem key={op} value={op}>
                      {op}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Effect">
              <Select
                value={effect}
                onValueChange={setEffect}
                disabled={!canManage}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POLICY_EFFECTS.map((ef) => (
                    <SelectItem key={ef} value={ef}>
                      {ef}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Priority">
              <FieldInput
                value={priority}
                disabled={!canManage}
                onChange={(e) => setPriority(e.target.value)}
              />
            </Field>
            <div className="flex items-center gap-2">
              <Switch
                checked={enabled}
                disabled={!canManage}
                onCheckedChange={setEnabled}
                aria-label="Enabled"
              />
              <span className="text-sm text-muted-foreground">Enabled</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Row filter rules</p>
                {canManage ? (
                  <Select
                    value="__add__"
                    onValueChange={(kind) => {
                      if (kind === "__add__") return;
                      setDraftRules((prev) => [
                        ...prev,
                        defaultRuleDraft(kind),
                      ]);
                    }}
                  >
                    <SelectTrigger className="w-[9rem]" size="sm">
                      <SelectValue placeholder="Add rule" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__add__">Add rule…</SelectItem>
                      {BUILTIN_POLICY_RULE_KINDS.map((kind) => (
                        <SelectItem key={kind} value={kind}>
                          {kind}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}
              </div>

              {draftRules.map((rule, index) => (
                <div
                  key={`${rule.kind}-${index}`}
                  className="space-y-2 rounded-md border border-border p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline">{rule.kind}</Badge>
                    {canManage ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setDraftRules((prev) =>
                            prev.filter((_, i) => i !== index),
                          )
                        }
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                  {rule.kind === "role_in" ? (
                    <Field label="Roles (comma)">
                      <FieldInput
                        disabled={!canManage}
                        value={(Array.isArray(rule.config.roles)
                          ? rule.config.roles
                          : []
                        ).join(",")}
                        onChange={(e) =>
                          updateRule(index, {
                            ...rule,
                            config: {
                              roles: e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            },
                          })
                        }
                      />
                    </Field>
                  ) : null}
                  {rule.kind === "bucket_eq" ? (
                    <Field label="Bucket">
                      <FieldInput
                        disabled={!canManage}
                        value={
                          typeof rule.config.bucket === "string"
                            ? rule.config.bucket
                            : ""
                        }
                        onChange={(e) =>
                          updateRule(index, {
                            ...rule,
                            config: { bucket: e.target.value },
                          })
                        }
                      />
                    </Field>
                  ) : null}
                  {rule.kind === "bucket_in" ? (
                    <Field label="Buckets (comma)">
                      <FieldInput
                        disabled={!canManage}
                        value={(Array.isArray(rule.config.buckets)
                          ? rule.config.buckets
                          : []
                        ).join(",")}
                        onChange={(e) =>
                          updateRule(index, {
                            ...rule,
                            config: {
                              buckets: e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            },
                          })
                        }
                      />
                    </Field>
                  ) : null}
                  {rule.kind === "owner_eq" || rule.kind === "claim_eq" ? (
                    <>
                      <Field label="Column">
                        {columns.length > 0 ? (
                          <Select
                            value={
                              typeof rule.config.column === "string"
                                ? rule.config.column
                                : columns[0]!
                            }
                            disabled={!canManage}
                            onValueChange={(column) =>
                              updateRule(index, {
                                ...rule,
                                config: { ...rule.config, column },
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {columns.map((col) => (
                                <SelectItem key={col} value={col}>
                                  {col}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <FieldInput
                            disabled={!canManage}
                            value={
                              typeof rule.config.column === "string"
                                ? rule.config.column
                                : ""
                            }
                            onChange={(e) =>
                              updateRule(index, {
                                ...rule,
                                config: {
                                  ...rule.config,
                                  column: e.target.value,
                                },
                              })
                            }
                          />
                        )}
                      </Field>
                      {rule.kind === "claim_eq" ? (
                        <Field label="Claim">
                          <FieldInput
                            disabled={!canManage}
                            value={
                              typeof rule.config.claim === "string"
                                ? rule.config.claim
                                : "email"
                            }
                            onChange={(e) =>
                              updateRule(index, {
                                ...rule,
                                config: {
                                  ...rule.config,
                                  claim: e.target.value,
                                },
                              })
                            }
                          />
                        </Field>
                      ) : null}
                    </>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="space-y-2 rounded-md border border-dashed border-border p-3">
              <p className="text-sm font-medium">Affected rows preview</p>
              <Field label="Preview as uid / claim value">
                <FieldInput
                  value={previewValue}
                  onChange={(e) => setPreviewValue(e.target.value)}
                  placeholder="current principal value"
                />
              </Field>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={runPreview}
              >
                Preview
              </Button>
              {preview ? (
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p>{preview.note}</p>
                  <p>
                    HTTP {preview.status}
                    {preview.count != null ? ` · count ${preview.count}` : ""}
                    {` · showing ${preview.rows.length}`}
                  </p>
                  {preview.rows.length > 0 ? (
                    <pre className="max-h-40 overflow-auto rounded border border-border bg-muted/30 p-2 font-mono text-[10px]">
                      {JSON.stringify(preview.rows, null, 2)}
                    </pre>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {mode !== "list" && mode !== "test" && canManage ? (
        <InspectorFooter>
          <Button type="button" disabled={isPending} onClick={save}>
            Save
          </Button>
          {mode === "edit" ? (
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </Button>
          ) : null}
        </InspectorFooter>
      ) : null}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete policy?</AlertDialogTitle>
            <AlertDialogDescription>
              Removes{" "}
              <span className="font-medium">{selected?.name ?? "this policy"}</span>{" "}
              from {table}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={removeSelected}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
