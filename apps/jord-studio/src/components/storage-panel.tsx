"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  FieldInput,
} from "@altr/apolyx";

import {
  canManageBlobs,
  canWriteBlobs,
  type JordRole,
} from "@/lib/auth/roles";
import { formatBytes, type BlobObject } from "@/lib/blobs";

type Props = {
  role: JordRole;
};

export function StoragePanel({ role }: Props) {
  const canManage = canManageBlobs(role);
  const canWrite = canWriteBlobs(role);

  const [buckets, setBuckets] = useState<string[]>([]);
  const [bucket, setBucket] = useState<string | null>(null);
  const [objects, setObjects] = useState<BlobObject[]>([]);
  const [newBucket, setNewBucket] = useState("");
  const [objectKey, setObjectKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadBuckets = useCallback(async () => {
    const res = await fetch("/api/blobs/buckets", { cache: "no-store" });
    const body = (await res.json()) as {
      buckets?: string[];
      message?: string;
    };
    if (!res.ok) {
      throw new Error(body.message ?? `List buckets failed (${res.status})`);
    }
    setBuckets(body.buckets ?? []);
  }, []);

  const loadObjects = useCallback(async (name: string) => {
    const res = await fetch(`/api/blobs/${encodeURIComponent(name)}`, {
      cache: "no-store",
    });
    const body = (await res.json()) as {
      objects?: BlobObject[];
      message?: string;
    };
    if (!res.ok) {
      throw new Error(body.message ?? `List objects failed (${res.status})`);
    }
    setObjects(body.objects ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await loadBuckets();
        if (!cancelled) setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load buckets");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadBuckets]);

  useEffect(() => {
    if (!bucket) {
      setObjects([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        await loadObjects(bucket);
        if (!cancelled) setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load objects");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bucket, loadObjects]);

  function createBucket() {
    if (!canManage) {
      setError(`Role "${role}" cannot create buckets.`);
      return;
    }
    const name = newBucket.trim();
    startTransition(async () => {
      try {
        const res = await fetch("/api/blobs/buckets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        const body = (await res.json()) as { message?: string };
        if (!res.ok) {
          setError(body.message ?? `Create failed (${res.status})`);
          return;
        }
        setNewBucket("");
        await loadBuckets();
        setBucket(name);
        setError(null);
      } catch {
        setError("Cannot reach Studio blob proxy.");
      }
    });
  }

  function onUpload(fileList: FileList | null) {
    if (!canWrite || !bucket) {
      setError(
        !bucket
          ? "Open a bucket first."
          : `Role "${role}" cannot upload blobs.`,
      );
      return;
    }
    const file = fileList?.[0];
    if (!file) return;
    const key = objectKey.trim() || file.name;
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/blobs/${encodeURIComponent(bucket)}/objects/${encodeURIComponent(key)}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": file.type || "application/octet-stream",
            },
            body: await file.arrayBuffer(),
          },
        );
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        if (!res.ok) {
          setError(body.message ?? `Upload failed (${res.status})`);
          return;
        }
        setObjectKey("");
        await loadObjects(bucket);
        setError(null);
      } catch {
        setError("Upload failed.");
      }
    });
  }

  function deleteObject(key: string) {
    if (!canWrite || !bucket) return;
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/blobs/${encodeURIComponent(bucket)}/objects/${encodeURIComponent(key)}`,
          { method: "DELETE" },
        );
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        if (!res.ok) {
          setError(body.message ?? `Delete failed (${res.status})`);
          return;
        }
        await loadObjects(bucket);
        setError(null);
      } catch {
        setError("Delete failed.");
      }
    });
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Storage
        </h1>
        <p className="text-sm text-muted-foreground">
          Local lab blobs under <code className="font-mono">data/blobs/</code>.
          Metadata lives in Jord; the browser never opens the disk.
        </p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Storage error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Buckets</h2>
        {canManage ? (
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[12rem] flex-1">
              <label className="mb-1 block text-xs text-muted-foreground">
                New bucket
              </label>
              <FieldInput
                value={newBucket}
                onChange={(e) => setNewBucket(e.target.value)}
                placeholder="lab"
              />
            </div>
            <Button
              type="button"
              disabled={isPending || !newBucket.trim()}
              onClick={createBucket}
            >
              Create
            </Button>
          </div>
        ) : (
          <Alert variant="info">
            <AlertTitle>Create locked</AlertTitle>
            <AlertDescription>
              Role <code className="font-mono">{role}</code> can browse and
              download only.
            </AlertDescription>
          </Alert>
        )}
        <ul className="flex flex-wrap gap-2">
          {buckets.length === 0 ? (
            <li className="text-sm text-muted-foreground">No buckets yet.</li>
          ) : (
            buckets.map((name) => (
              <li key={name}>
                <Button
                  type="button"
                  size="sm"
                  variant={bucket === name ? "default" : "outline"}
                  onClick={() => setBucket(name)}
                >
                  {name}
                </Button>
              </li>
            ))
          )}
        </ul>
      </section>

      {bucket ? (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">
            Objects · <code className="font-mono">{bucket}</code>
          </h2>
          {canWrite ? (
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[12rem] flex-1">
                <label className="mb-1 block text-xs text-muted-foreground">
                  Object key (optional)
                </label>
                <FieldInput
                  value={objectKey}
                  onChange={(e) => setObjectKey(e.target.value)}
                  placeholder="folder/file.txt"
                />
              </div>
              <label className="inline-flex cursor-pointer items-center">
                <span className="sr-only">Upload file</span>
                <input
                  type="file"
                  className="text-sm"
                  disabled={isPending}
                  onChange={(e) => {
                    onUpload(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Key</th>
                  <th className="py-2 pr-3 font-medium">Type</th>
                  <th className="py-2 pr-3 font-medium">Size</th>
                  <th className="py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {objects.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-6 text-muted-foreground"
                    >
                      Empty bucket.
                    </td>
                  </tr>
                ) : (
                  objects.map((obj) => (
                    <tr
                      key={obj.id}
                      className="border-b border-border/60 align-middle"
                    >
                      <td className="py-2 pr-3 font-mono text-xs">{obj.key}</td>
                      <td className="py-2 pr-3 text-muted-foreground">
                        {obj.content_type}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">
                        {formatBytes(obj.size)}
                      </td>
                      <td className="py-2">
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" size="sm" variant="outline" asChild>
                            <a
                              href={`/api/blobs/${encodeURIComponent(bucket)}/objects/${encodeURIComponent(obj.key)}`}
                              download={obj.key.split("/").pop()}
                            >
                              Download
                            </a>
                          </Button>
                          {canWrite ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={isPending}
                              onClick={() => deleteObject(obj.key)}
                            >
                              Delete
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
