"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Field,
  FieldInput,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@altr/apolyx";

import { useInspectorOptional } from "@/components/inspector-host";
import { useProjectHref } from "@/hooks/use-project-path";
import type { JordRole } from "@/lib/auth/roles";
import type { PublicPolicy } from "@/lib/database-api";
import type { GeneratedApiCatalog } from "@/lib/generated-api";
import type { PublicCustomApi } from "@/lib/functions-api";
import { isRealtimeSubscribeTable } from "@/lib/realtime-table";
import {
  POLICIES_CHANGED_EVENT,
  buildExampleCurl,
  buildExampleFetch,
  buildTableApiEndpoints,
  qualifyTable,
  realtimeChannelName,
  tryItBffPath,
  type TableApiEndpoint,
} from "@/lib/studio-table-apis";
import { summarizePolicyRules } from "@/lib/studio-table-policies";

type ApiError = { error?: string; message?: string };

type Props = {
  role: JordRole;
  table: string;
  schema: string;
};

export function TableApisDrawer({ role, table, schema }: Props) {
  void role;
  const hrefFor = useProjectHref();
  const inspector = useInspectorOptional();
  const [tab, setTab] = useState("table");
  const [error, setError] = useState<string | null>(null);
  const [policies, setPolicies] = useState<PublicPolicy[]>([]);
  const [customApis, setCustomApis] = useState<PublicCustomApi[]>([]);
  const [generatedOn, setGeneratedOn] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>("v1-get");
  const [tryQuery, setTryQuery] = useState("limit=20");
  const [tryBody, setTryBody] = useState("");
  const [tryOut, setTryOut] = useState<string | null>(null);

  const publishablePlaceholder = "jord_pub_…";

  const loadMeta = useCallback(async () => {
    setError(null);
    const [polRes, genRes, customRes] = await Promise.all([
      fetch("/api/policies", { cache: "no-store" }),
      fetch("/api/apis/generated", { cache: "no-store" }),
      fetch("/api/custom-apis", { cache: "no-store" }),
    ]);
    if (polRes.ok) {
      const data = (await polRes.json()) as { policies: PublicPolicy[] };
      setPolicies(data.policies.filter((p) => p.table_name === table));
    }
    if (genRes.ok) {
      const catalog = (await genRes.json()) as GeneratedApiCatalog;
      const match = catalog.resources.find(
        (r) => r.table === table || r.id === table,
      );
      setGeneratedOn(match ? match.enabled : table === "records");
    }
    if (customRes.ok) {
      const data = (await customRes.json()) as {
        custom_apis: PublicCustomApi[];
      };
      // Custom APIs are not table-bound yet — show all for discovery.
      setCustomApis(data.custom_apis);
    }
  }, [table]);

  useEffect(() => {
    let cancelled = false;
    startTransition(async () => {
      try {
        await loadMeta();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [loadMeta]);

  useEffect(() => {
    function onPolicies(ev: Event) {
      const detail = (ev as CustomEvent<{ table?: string }>).detail;
      if (detail?.table && detail.table !== table) return;
      void loadMeta();
    }
    window.addEventListener(POLICIES_CHANGED_EVENT, onPolicies);
    return () => window.removeEventListener(POLICIES_CHANGED_EVENT, onPolicies);
  }, [loadMeta, table]);

  const endpoints = useMemo(
    () =>
      buildTableApiEndpoints({
        table,
        schema,
        publishableKeyPlaceholder: publishablePlaceholder,
        generatedEnabled: generatedOn,
        customApis: customApis.map((a) => ({
          id: a.id,
          method: a.method,
          path: `/api/x/${a.slug}`,
          name: a.name,
        })),
      }),
    [table, schema, generatedOn, customApis],
  );

  const selected =
    endpoints.find((e) => e.id === selectedId) ?? endpoints[0] ?? null;

  useEffect(() => {
    if (!selected) return;
    setTryQuery(selected.defaultQuery ?? "");
    setTryBody(selected.defaultBody ?? "");
    setTryOut(null);
  }, [selected?.id]);

  const byGroup = useMemo(() => {
    const groups: Record<"generated" | "table" | "custom", TableApiEndpoint[]> =
      {
        generated: [],
        table: [],
        custom: [],
      };
    for (const ep of endpoints) groups[ep.group].push(ep);
    return groups;
  }, [endpoints]);

  async function copyText(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
    }
  }

  function runTry() {
    if (!selected) return;
    startTransition(async () => {
      try {
        const path = tryItBffPath(selected, tryQuery);
        const init: RequestInit = {
          method: selected.method,
          cache: "no-store",
        };
        if (
          tryBody &&
          selected.method !== "GET" &&
          selected.method !== "DELETE"
        ) {
          init.headers = { "content-type": "application/json" };
          init.body = tryBody;
        }
        const res = await fetch(path, init);
        const text = await res.text();
        setTryOut(`${res.status}\n${text.slice(0, 4000)}`);
      } catch (err) {
        setTryOut(
          err instanceof Error ? err.message : "Network error talking to BFF.",
        );
      }
    });
  }

  const qualified = qualifyTable(schema, table);
  const channel = realtimeChannelName(table);
  const canRealtime = isRealtimeSubscribeTable(table);

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">
          Call sites for <code className="font-mono">{qualified}</code>
        </p>
        <p className="text-[11px] text-muted-foreground">
          Examples use the project publishable key placeholder — never paste a
          secret or raw JWT. Try-it runs through the Studio session cookie.
        </p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-xs">
        <p className="font-medium text-foreground">Policies on this table</p>
        {policies.length === 0 ? (
          <p className="mt-1 text-muted-foreground">None yet.</p>
        ) : (
          <ul className="mt-1 space-y-1 text-muted-foreground">
            {policies.map((p) => (
              <li key={p.id}>
                <Badge
                  variant={p.enabled ? "secondary" : "outline"}
                  className="mr-1 text-[10px]"
                >
                  {p.operation}
                </Badge>
                {summarizePolicyRules(p.rules).text}
                {!p.enabled ? " (off)" : ""}
              </li>
            ))}
          </ul>
        )}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="mt-2"
          onClick={() => inspector?.open("policies", { table, schema })}
        >
          Edit policies
        </Button>
      </div>

      <div className="rounded-md border border-border px-3 py-2 text-xs">
        <p className="font-medium">Realtime channel</p>
        {canRealtime ? (
          <p className="mt-1 font-mono text-muted-foreground">
            GET /realtime?table={table} · channel{" "}
            <code>{channel}</code>
          </p>
        ) : (
          <p className="mt-1 text-muted-foreground">
            Reserved / system table — no subscribe channel.
          </p>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full">
          <TabsTrigger value="generated" className="flex-1">
            Generated
          </TabsTrigger>
          <TabsTrigger value="table" className="flex-1">
            Table API
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex-1">
            Custom
          </TabsTrigger>
        </TabsList>

        {(["generated", "table", "custom"] as const).map((group) => (
          <TabsContent key={group} value={group} className="space-y-3">
            {byGroup[group].length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {group === "generated" && !generatedOn
                  ? "Generated API is disabled for this resource."
                  : "Nothing listed."}
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {byGroup[group].map((ep) => (
                  <li key={ep.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(ep.id)}
                      className={
                        selected?.id === ep.id
                          ? "w-full rounded-md bg-muted px-2 py-1.5 text-left text-sm"
                          : "w-full rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted/60"
                      }
                    >
                      <span className="font-mono text-[11px] uppercase">
                        {ep.method}
                      </span>{" "}
                      <span className="font-mono text-[11px]">{ep.path}</span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {ep.summary}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {selected ? (
        <div className="space-y-3 border-t border-border pt-3">
          <div className="space-y-1">
            <p className="text-sm font-medium">{selected.summary}</p>
            <p className="font-mono text-[11px] text-muted-foreground">
              {selected.method} {selected.path}
            </p>
            <p className="font-mono text-[11px] text-muted-foreground">
              {selected.authHeader}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                void copyText("curl", buildExampleCurl(selected))
              }
            >
              {copied === "curl" ? "Copied curl" : "Copy curl"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                void copyText("fetch", buildExampleFetch(selected))
              }
            >
              {copied === "fetch" ? "Copied fetch" : "Copy fetch"}
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <Link href={hrefFor("/apis/table")}>Full playground</Link>
            </Button>
          </div>

          <pre className="max-h-28 overflow-auto rounded-md border border-border bg-muted/30 p-2 font-mono text-[10px]">
            {buildExampleCurl(selected)}
          </pre>

          <Field label="Try-it query">
            <FieldInput
              value={tryQuery}
              onChange={(e) => setTryQuery(e.target.value)}
            />
          </Field>
          {selected.method !== "GET" && selected.method !== "DELETE" ? (
            <Field label="Try-it body">
              <textarea
                className="min-h-20 w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-xs"
                value={tryBody}
                onChange={(e) => setTryBody(e.target.value)}
              />
            </Field>
          ) : null}
          <Button
            type="button"
            size="sm"
            disabled={isPending}
            onClick={runTry}
          >
            Try it
          </Button>
          {tryOut ? (
            <pre className="max-h-48 overflow-auto rounded-md border border-border bg-muted/30 p-2 font-mono text-[10px]">
              {tryOut}
            </pre>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
