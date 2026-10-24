"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  FieldInput,
} from "@altr/apolyx";

import { canWriteVectors, type JordRole } from "@/lib/auth/roles";

type EmbeddingMeta = {
  id: string;
  namespace: string;
  ref_id: string | null;
  dims: number;
  metadata: string | null;
  updated_at: number;
};

type Hit = {
  id: string;
  ref_id: string | null;
  score: number;
  dims: number;
};

type Props = { role: JordRole };

const SAMPLE_8 = "[1,0,0,0,0,0,0,0]";

export function VectorsPanel({ role }: Props) {
  const canWrite = canWriteVectors(role);
  const [namespaces, setNamespaces] = useState<string[]>([]);
  const [namespace, setNamespace] = useState("lab");
  const [rows, setRows] = useState<EmbeddingMeta[]>([]);
  const [embId, setEmbId] = useState("demo-a");
  const [embJson, setEmbJson] = useState(SAMPLE_8);
  const [queryJson, setQueryJson] = useState(SAMPLE_8);
  const [hits, setHits] = useState<Hit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const refreshNamespaces = useCallback(async () => {
    const res = await fetch("/api/vectors/namespaces", { cache: "no-store" });
    const body = (await res.json()) as {
      namespaces?: string[];
      message?: string;
    };
    if (!res.ok) throw new Error(body.message ?? `Failed (${res.status})`);
    setNamespaces(body.namespaces ?? []);
  }, []);

  const refreshList = useCallback(async (ns: string) => {
    const res = await fetch(`/api/vectors/${encodeURIComponent(ns)}`, {
      cache: "no-store",
    });
    const body = (await res.json()) as {
      embeddings?: EmbeddingMeta[];
      message?: string;
    };
    if (!res.ok) throw new Error(body.message ?? `Failed (${res.status})`);
    setRows(body.embeddings ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await refreshNamespaces();
        if (!cancelled) setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Load failed");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshNamespaces]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await refreshList(namespace);
        if (!cancelled) setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "List failed");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [namespace, refreshList]);

  function parseVec(raw: string): number[] {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) throw new Error("embedding must be a JSON array");
    return parsed as number[];
  }

  function upsert() {
    if (!canWrite) {
      setError(`Role "${role}" cannot write vectors.`);
      return;
    }
    startTransition(async () => {
      try {
        const embedding = parseVec(embJson);
        const res = await fetch(
          `/api/vectors/${encodeURIComponent(namespace)}/${encodeURIComponent(embId)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ embedding }),
          },
        );
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        if (!res.ok) {
          setError(body.message ?? `Upsert failed (${res.status})`);
          return;
        }
        await refreshNamespaces();
        await refreshList(namespace);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upsert failed");
      }
    });
  }

  function search() {
    startTransition(async () => {
      try {
        const embedding = parseVec(queryJson);
        const res = await fetch(
          `/api/vectors/${encodeURIComponent(namespace)}/search`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ embedding, limit: 10 }),
          },
        );
        const body = (await res.json()) as {
          hits?: Hit[];
          message?: string;
        };
        if (!res.ok) {
          setError(body.message ?? `Search failed (${res.status})`);
          return;
        }
        setHits(body.hits ?? []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed");
      }
    });
  }

  function remove(id: string) {
    if (!canWrite) return;
    startTransition(async () => {
      const res = await fetch(
        `/api/vectors/${encodeURIComponent(namespace)}/${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setError(body.message ?? `Delete failed (${res.status})`);
        return;
      }
      await refreshList(namespace);
      setError(null);
    });
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Vectors
        </h1>
        <p className="text-sm text-muted-foreground">
          Local lab embeddings. You supply float arrays — Jord does not call an
          embed model. Search uses cosine similarity.
        </p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Vectors error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Namespace</h2>
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[12rem] flex-1">
            <label className="mb-1 block text-xs text-muted-foreground">
              Namespace
            </label>
            <FieldInput
              value={namespace}
              onChange={(e) => setNamespace(e.target.value.trim() || "lab")}
            />
          </div>
          <ul className="flex flex-wrap gap-2">
            {namespaces.map((ns) => (
              <li key={ns}>
                <Button
                  type="button"
                  size="sm"
                  variant={namespace === ns ? "default" : "outline"}
                  onClick={() => setNamespace(ns)}
                >
                  {ns}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {canWrite ? (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Upsert</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Id
              </label>
              <FieldInput value={embId} onChange={(e) => setEmbId(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-muted-foreground">
                Embedding JSON (8–1536 floats)
              </label>
              <FieldInput
                value={embJson}
                onChange={(e) => setEmbJson(e.target.value)}
              />
            </div>
          </div>
          <Button type="button" disabled={isPending} onClick={upsert}>
            Upsert
          </Button>
        </section>
      ) : (
        <Alert variant="info">
          <AlertTitle>Read-only</AlertTitle>
          <AlertDescription>
            Role <code className="font-mono">{role}</code> can search and list
            only.
          </AlertDescription>
        </Alert>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Stored · {namespace}</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Id</th>
                <th className="py-2 pr-3 font-medium">Dims</th>
                <th className="py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-6 text-muted-foreground">
                    No embeddings in this namespace.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-border/60">
                    <td className="py-2 pr-3 font-mono text-xs">{row.id}</td>
                    <td className="py-2 pr-3 tabular-nums">{row.dims}</td>
                    <td className="py-2">
                      {canWrite ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={isPending}
                          onClick={() => remove(row.id)}
                        >
                          Delete
                        </Button>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Search</h2>
        <FieldInput
          value={queryJson}
          onChange={(e) => setQueryJson(e.target.value)}
        />
        <Button type="button" disabled={isPending} onClick={search}>
          Search
        </Button>
        <ul className="space-y-1 text-sm">
          {hits.map((h) => (
            <li key={h.id} className="font-mono text-xs">
              {h.id} · score {h.score.toFixed(4)}
              {h.ref_id ? ` · ref ${h.ref_id}` : ""}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
