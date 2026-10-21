"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@altr/apolyx";

import {
  canInvokeApis,
  canManageApis,
  type JordRole,
} from "@/lib/auth/roles";
import {
  buildCustomCurl,
  CUSTOM_HTTP_METHODS,
  type CustomHttpMethod,
  type PublicCustomApi,
  type PublicFunction,
} from "@/lib/functions-api";

type ApiError = { error?: string; message?: string };

type Props = {
  role: JordRole;
};

export function CustomApisPanel({ role }: Props) {
  const canManage = canManageApis(role);
  const canInvoke = canInvokeApis(role);
  const [apis, setApis] = useState<PublicCustomApi[] | null>(null);
  const [functions, setFunctions] = useState<PublicFunction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("Echo GET");
  const [method, setMethod] = useState<CustomHttpMethod>("GET");
  const [slug, setSlug] = useState("echo");
  const [functionId, setFunctionId] = useState("");
  const [tryResult, setTryResult] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(async () => {
    setError(null);
    const [apisRes, fnRes] = await Promise.all([
      fetch("/api/custom-apis", { cache: "no-store" }),
      fetch("/api/functions", { cache: "no-store" }),
    ]);
    if (!apisRes.ok) {
      const body = (await apisRes.json().catch(() => ({}))) as ApiError;
      throw new Error(
        body.message ??
          (apisRes.status === 503
            ? "jord-server is down — start `pnpm dev:jord`."
            : `Failed to load custom APIs (${apisRes.status}).`),
      );
    }
    const apisData = (await apisRes.json()) as { custom_apis: PublicCustomApi[] };
    setApis(apisData.custom_apis);
    if (fnRes.ok) {
      const fnData = (await fnRes.json()) as { functions: PublicFunction[] };
      setFunctions(fnData.functions);
      setFunctionId((prev) => prev || fnData.functions[0]?.id || "");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    startTransition(async () => {
      try {
        await load();
      } catch (err) {
        if (!cancelled) {
          setApis(null);
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  function createApi() {
    if (!canManage) return;
    startTransition(async () => {
      setError(null);
      const res = await fetch("/api/custom-apis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          method,
          slug,
          function_id: functionId,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as ApiError;
        setError(body.message ?? `Create failed (${res.status}).`);
        return;
      }
      await load();
    });
  }

  function toggleEnabled(api: PublicCustomApi, enabled: boolean) {
    if (!canManage) return;
    startTransition(async () => {
      setError(null);
      const res = await fetch(`/api/custom-apis/${encodeURIComponent(api.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as ApiError;
        setError(body.message ?? `Update failed (${res.status}).`);
        return;
      }
      await load();
    });
  }

  function deleteApi(id: string) {
    if (!canManage) return;
    startTransition(async () => {
      setError(null);
      const res = await fetch(`/api/custom-apis/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as ApiError;
        setError(body.message ?? `Delete failed (${res.status}).`);
        return;
      }
      await load();
    });
  }

  function tryInvoke(api: PublicCustomApi) {
    if (!canInvoke) return;
    startTransition(async () => {
      setError(null);
      setTryResult(null);
      const res = await fetch(`/api/x/${encodeURIComponent(api.slug)}`, {
        method: api.method,
        headers:
          api.method === "GET" || api.method === "DELETE"
            ? undefined
            : { "Content-Type": "application/json" },
        body:
          api.method === "GET" || api.method === "DELETE"
            ? undefined
            : "{}",
      });
      const text = await res.text();
      setTryResult(`${api.method} /api/x/${api.slug} → ${res.status}\n${text}`);
      if (!res.ok) {
        try {
          const body = JSON.parse(text) as ApiError;
          setError(body.message ?? body.error ?? `Invoke failed (${res.status}).`);
        } catch {
          setError(`Invoke failed (${res.status}).`);
        }
      }
    });
  }

  async function copyCurl(api: PublicCustomApi) {
    const curl = buildCustomCurl(api.method, api.slug);
    try {
      await navigator.clipboard.writeText(curl);
      setCopied(api.id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setError("Clipboard unavailable.");
    }
  }

  function fnLabel(id: string) {
    return functions.find((f) => f.id === id)?.slug ?? id.slice(0, 8);
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          APIs
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Custom APIs
        </h1>
        <p className="text-sm text-muted-foreground">
          Named <code className="font-mono">METHOD /x/:slug</code> bindings to a
          function. Disabled → 503. Traffic stays on the Studio BFF.
        </p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Custom APIs error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {canManage ? (
        <div className="grid gap-4 rounded-lg border border-border bg-muted/20 p-4 sm:grid-cols-2">
          <Field label="Name">
            <FieldInput value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Method">
            <Select
              value={method}
              onValueChange={(v) => setMethod(v as CustomHttpMethod)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CUSTOM_HTTP_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Slug">
            <FieldInput
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="font-mono"
            />
          </Field>
          <Field label="Function">
            <Select value={functionId} onValueChange={setFunctionId}>
              <SelectTrigger>
                <SelectValue placeholder="Select function" />
              </SelectTrigger>
              <SelectContent>
                {functions.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.slug}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Button
              type="button"
              disabled={isPending || !functionId}
              onClick={createApi}
            >
              Create custom API
            </Button>
          </div>
        </div>
      ) : (
        <Alert variant="info">
          <AlertTitle>Inspect only</AlertTitle>
          <AlertDescription>
            Role <code className="font-mono">{role}</code> can list routes; only admin
            can create or toggle.{" "}
            {canInvoke ? "You may try-it." : "Readonly cannot invoke."}
          </AlertDescription>
        </Alert>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Function</TableHead>
              <TableHead>Enabled</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(apis ?? []).map((api) => (
              <TableRow key={api.id}>
                <TableCell className="font-medium">{api.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {api.method} /x/{api.slug}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {fnLabel(api.function_id)}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={api.enabled}
                    disabled={!canManage || isPending}
                    onCheckedChange={(v) => toggleEnabled(api, v)}
                    aria-label={`Enable ${api.name}`}
                  />
                </TableCell>
                <TableCell className="space-x-1 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void copyCurl(api)}
                  >
                    {copied === api.id ? "Copied" : "Copy curl"}
                  </Button>
                  {canInvoke ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => tryInvoke(api)}
                    >
                      Try
                    </Button>
                  ) : null}
                  {canManage ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => deleteApi(api.id)}
                    >
                      Delete
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
            {apis?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  No custom APIs yet — create a function first.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      {tryResult ? (
        <pre className="overflow-x-auto rounded-md bg-muted/40 p-3 font-mono text-xs">
          {tryResult}
        </pre>
      ) : null}
    </div>
  );
}
