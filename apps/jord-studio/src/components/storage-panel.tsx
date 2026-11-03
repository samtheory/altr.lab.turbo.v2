"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";

import {
  Alert,
  AlertDescription,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertTitle,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Progress,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@altr/apolyx";
import { Download, Eye, Link2, Trash2, Upload } from "lucide-react";

import { BucketSettingsPanel } from "@/components/bucket-settings-panel";
import { useInspectorOptional } from "@/components/inspector-host";
import {
  canManageBlobs,
  canWriteBlobs,
  type JordRole,
} from "@/lib/auth/roles";
import { formatBytes, type BlobObject } from "@/lib/blobs";
import {
  bucketProviderLabel,
  bucketStatusLabel,
  emitBucketsChanged,
  formatSignedExpiry,
  formatTimestamp,
  parseErrorText,
  previewKind,
  readApiError,
  type BucketPublic,
  type PreviewKind,
} from "@/lib/bucket-admin";

type Props = {
  role: JordRole;
};

type UploadItem = {
  id: string;
  key: string;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
};

type PreviewState = {
  object: BlobObject;
  kind: PreviewKind;
  text?: string;
  textError?: string;
};

type SignedLink = { key: string; url: string; expiresAt: number };

function objectUrl(bucket: string, key: string): string {
  return `/api/blobs/${encodeURIComponent(bucket)}/objects/${encodeURIComponent(key)}`;
}

function uploadWithProgress(
  url: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(
        new Error(
          parseErrorText(xhr.responseText, xhr.status) ??
            `Upload failed (${xhr.status})`,
        ),
      );
    };
    xhr.onerror = () => reject(new Error("Upload failed — network error."));
    xhr.send(file);
  });
}

export function StoragePanel({ role }: Props) {
  const canManage = canManageBlobs(role);
  const canWrite = canWriteBlobs(role);
  const searchParams = useSearchParams();
  const inspector = useInspectorOptional();

  const [names, setNames] = useState<string[]>([]);
  const [objects, setObjects] = useState<BlobObject[]>([]);
  const [config, setConfig] = useState<BucketPublic | null>(null);
  const [tab, setTab] = useState("objects");
  const [search, setSearch] = useState("");
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BlobObject | null>(null);
  const [signed, setSigned] = useState<SignedLink | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const dragDepth = useRef(0);

  const requested = searchParams.get("bucket");
  const bucket = requested && requested.length > 0 ? requested : names[0] ?? "";

  const loadNames = useCallback(async () => {
    const res = await fetch("/api/blobs/buckets", { cache: "no-store" });
    if (!res.ok) throw new Error(await readApiError(res));
    const body = (await res.json()) as { buckets?: string[] };
    setNames(body.buckets ?? []);
  }, []);

  const loadObjects = useCallback(async (name: string) => {
    const res = await fetch(`/api/blobs/${encodeURIComponent(name)}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(await readApiError(res));
    const body = (await res.json()) as { objects?: BlobObject[] };
    setObjects(body.objects ?? []);
  }, []);

  const loadConfig = useCallback(async (name: string) => {
    if (!canManage) return;
    const res = await fetch(`/api/admin/buckets/${encodeURIComponent(name)}`, {
      cache: "no-store",
    });
    if (res.status === 404 || res.status === 403) {
      setConfig(null);
      return;
    }
    if (!res.ok) return;
    const body = (await res.json()) as { bucket?: BucketPublic };
    setConfig(body.bucket ?? null);
  }, [canManage]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await loadNames();
        if (!cancelled) setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load buckets",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadNames]);

  useEffect(() => {
    if (!bucket) {
      setObjects([]);
      setConfig(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        await Promise.all([loadObjects(bucket), loadConfig(bucket)]);
        if (!cancelled) setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load bucket",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bucket, loadObjects, loadConfig]);

  useEffect(() => {
    setSigned(null);
    setSearch("");
    setUploads([]);
    setTab("objects");
  }, [bucket]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return objects;
    return objects.filter(
      (object) =>
        object.key.toLowerCase().includes(needle) ||
        object.content_type.toLowerCase().includes(needle),
    );
  }, [objects, search]);

  const totalBytes = useMemo(
    () => objects.reduce((sum, object) => sum + object.size, 0),
    [objects],
  );

  async function handleFiles(files: FileList | File[]) {
    if (!canWrite) {
      setError(`Role "${role}" cannot upload objects.`);
      return;
    }
    if (!bucket) {
      setError("Open a bucket first.");
      return;
    }
    const list = Array.from(files);
    if (list.length === 0) return;
    setError(null);
    setSigned(null);

    for (const file of list) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const key = file.name;
      setUploads((prev) => [
        ...prev,
        { id, key, progress: 0, status: "uploading" },
      ]);
      try {
        await uploadWithProgress(objectUrl(bucket, key), file, (percent) => {
          setUploads((prev) =>
            prev.map((item) => (item.id === id ? { ...item, progress: percent } : item)),
          );
        });
        setUploads((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, progress: 100, status: "done" } : item,
          ),
        );
      } catch (err) {
        setUploads((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: "error",
                  error:
                    err instanceof Error ? err.message : "Upload failed",
                }
              : item,
          ),
        );
      }
    }

    try {
      await loadObjects(bucket);
      emitBucketsChanged();
    } catch {
      // The per-file rows already carry the failure reason.
    }
  }

  function onDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current = 0;
    setDragActive(false);
    if (event.dataTransfer.files?.length) {
      void handleFiles(event.dataTransfer.files);
    }
  }

  async function openPreview(object: BlobObject) {
    const kind = previewKind(object.content_type);
    if (kind === "none") return;
    setPreview({ object, kind });
    if (kind === "text") {
      try {
        const res = await fetch(objectUrl(bucket, object.key), {
          cache: "no-store",
        });
        if (!res.ok) {
          const message = await readApiError(res);
          setPreview((prev) =>
            prev && prev.object.key === object.key
              ? { ...prev, textError: message }
              : prev,
          );
          return;
        }
        const text = await res.text();
        setPreview((prev) =>
          prev && prev.object.key === object.key
            ? { ...prev, text: text.slice(0, 200_000) }
            : prev,
        );
      } catch {
        setPreview((prev) =>
          prev && prev.object.key === object.key
            ? { ...prev, textError: "Preview failed to load." }
            : prev,
        );
      }
    }
  }

  async function copySignedUrl(object: BlobObject) {
    setError(null);
    try {
      const res = await fetch(`${objectUrl(bucket, object.key)}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "download",
          ttl_seconds: config?.sign_ttl_seconds ?? 300,
        }),
      });
      if (!res.ok) {
        setError(await readApiError(res));
        return;
      }
      const body = (await res.json()) as {
        url?: string;
        expires_at?: number;
      };
      if (!body.url || !body.expires_at) {
        setError("Sign response was missing url or expiry.");
        return;
      }
      setSigned({
        key: object.key,
        url: body.url,
        expiresAt: body.expires_at,
      });
      try {
        await navigator.clipboard.writeText(body.url);
      } catch {
        // Clipboard can be blocked outside a secure context; the banner keeps
        // the URL selectable.
      }
    } catch {
      setError("Cannot reach Studio BFF.");
    }
  }

  async function deleteObject() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    setError(null);
    try {
      const res = await fetch(objectUrl(bucket, target.key), {
        method: "DELETE",
      });
      if (!res.ok) {
        setError(await readApiError(res));
        return;
      }
      await loadObjects(bucket);
      emitBucketsChanged();
    } catch {
      setError("Cannot reach Studio BFF.");
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Storage
          </h1>
          <p className="text-sm text-muted-foreground">
            {bucket ? (
              <>
                Bucket{" "}
                <code className="font-mono text-foreground">{bucket}</code> ·{" "}
                {objects.length} object{objects.length === 1 ? "" : "s"} ·{" "}
                {formatBytes(totalBytes)}
              </>
            ) : (
              "Buckets hold objects; metadata lives in Jord and bytes live in the configured provider."
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {bucket ? (
            <Badge variant="outline">
              {bucketProviderLabel(config?.provider ?? null)}
            </Badge>
          ) : null}
          {config ? (
            <Badge
              variant={config.status === "paused" ? "destructive" : "success"}
            >
              {bucketStatusLabel(config.status)}
            </Badge>
          ) : null}
          {canManage ? (
            <Button
              type="button"
              size="sm"
              onClick={() => inspector?.open("create-bucket")}
            >
              New bucket
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Storage error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {signed ? (
        <Alert variant="info">
          <AlertTitle>
            Signed URL for <code className="font-mono">{signed.key}</code>
          </AlertTitle>
          <AlertDescription>
            <span className="block break-all font-mono text-[11px]">
              {signed.url}
            </span>
            <span className="mt-1 block text-xs">
              {formatSignedExpiry(signed.expiresAt)} · copied to clipboard when
              allowed.
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => {
                void navigator.clipboard.writeText(signed.url).catch(() => {});
              }}
            >
              Copy again
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {!bucket ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-12 text-center">
          <p className="text-sm font-medium">No buckets yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {canManage
              ? "Create a bucket from the Storage sidebar to start uploading."
              : "Ask an admin to create a bucket."}
          </p>
        </div>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList aria-label="Bucket sections">
            <TabsTrigger value="objects">Objects</TabsTrigger>
            {canManage ? (
              <TabsTrigger value="settings">Settings</TabsTrigger>
            ) : null}
          </TabsList>

          <TabsContent value="objects" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search keys or types"
                aria-label="Search objects"
                className="w-[min(100%,18rem)]"
              />
              {canWrite ? (
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">
                  <Upload className="size-4" aria-hidden />
                  Choose files
                  <input
                    type="file"
                    multiple
                    className="sr-only"
                    onChange={(event) => {
                      if (event.target.files) void handleFiles(event.target.files);
                      event.target.value = "";
                    }}
                  />
                </label>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Role <code className="font-mono">{role}</code> can browse and
                  download only.
                </span>
              )}
            </div>

            {canWrite ? (
              <div
                onDragEnter={(event) => {
                  event.preventDefault();
                  dragDepth.current += 1;
                  setDragActive(true);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={(event) => {
                  event.preventDefault();
                  dragDepth.current = Math.max(0, dragDepth.current - 1);
                  if (dragDepth.current === 0) setDragActive(false);
                }}
                onDrop={onDrop}
                className={
                  dragActive
                    ? "rounded-lg border-2 border-dashed border-primary bg-primary/5 px-4 py-8 text-center"
                    : "rounded-lg border-2 border-dashed border-border px-4 py-8 text-center"
                }
              >
                <Upload
                  className="mx-auto size-5 text-muted-foreground"
                  aria-hidden
                />
                <p className="mt-2 text-sm font-medium">
                  Drop files to upload to{" "}
                  <code className="font-mono">{bucket}</code>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Size and MIME limits are enforced server-side; the same file
                  name overwrites the key.
                </p>
              </div>
            ) : null}

            {uploads.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {uploads.map((upload) => (
                  <li
                    key={upload.id}
                    className="rounded-md border border-border px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-mono text-xs">
                        {upload.key}
                      </span>
                      <span
                        className={
                          upload.status === "error"
                            ? "text-xs text-destructive"
                            : "text-xs text-muted-foreground"
                        }
                      >
                        {upload.status === "uploading"
                          ? `${upload.progress}%`
                          : upload.status === "done"
                            ? "uploaded"
                            : "failed"}
                      </span>
                    </div>
                    {upload.status === "uploading" ? (
                      <Progress value={upload.progress} className="mt-2 h-1.5" />
                    ) : null}
                    {upload.error ? (
                      <p className="mt-1 text-xs text-destructive">
                        {upload.error}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Key</th>
                    <th className="py-2 pr-3 font-medium">Type</th>
                    <th className="py-2 pr-3 font-medium">Size</th>
                    <th className="py-2 pr-3 font-medium">Updated</th>
                    <th className="py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-muted-foreground">
                        Loading objects…
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-muted-foreground">
                        {objects.length === 0
                          ? "Empty bucket."
                          : "No objects match this search."}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((object) => {
                      const kind = previewKind(object.content_type);
                      return (
                        <tr
                          key={object.id}
                          className="border-b border-border/60 align-middle"
                        >
                          <td className="max-w-[18rem] truncate py-2 pr-3 font-mono text-xs">
                            {object.key}
                          </td>
                          <td className="py-2 pr-3 text-muted-foreground">
                            {object.content_type}
                          </td>
                          <td className="py-2 pr-3 tabular-nums">
                            {formatBytes(object.size)}
                          </td>
                          <td className="py-2 pr-3 text-xs text-muted-foreground">
                            {formatTimestamp(object.updated_at)}
                          </td>
                          <td className="py-2">
                            <div className="flex flex-wrap gap-1">
                              {kind !== "none" ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => void openPreview(object)}
                                  aria-label={`Preview ${object.key}`}
                                >
                                  <Eye className="size-3.5" aria-hidden />
                                </Button>
                              ) : null}
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                asChild
                              >
                                <a
                                  href={objectUrl(bucket, object.key)}
                                  download={object.key.split("/").pop()}
                                  aria-label={`Download ${object.key}`}
                                >
                                  <Download className="size-3.5" aria-hidden />
                                </a>
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => void copySignedUrl(object)}
                                aria-label={`Copy signed URL for ${object.key}`}
                              >
                                <Link2 className="size-3.5" aria-hidden />
                              </Button>
                              {canWrite ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setDeleteTarget(object)}
                                  aria-label={`Delete ${object.key}`}
                                >
                                  <Trash2
                                    className="size-3.5 text-destructive"
                                    aria-hidden
                                  />
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {canManage ? (
            <TabsContent value="settings">
              {config ? (
                <BucketSettingsPanel
                  bucket={config}
                  canManage={canManage}
                  onUpdated={(next) => {
                    setConfig(next);
                    emitBucketsChanged();
                  }}
                />
              ) : (
                <Alert variant="info">
                  <AlertTitle>Settings unavailable</AlertTitle>
                  <AlertDescription>
                    This bucket has no registry row yet. Recreate it from the
                    New bucket wizard to configure a provider, limits and
                    credentials.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          ) : null}
        </Tabs>
      )}

      <AlertDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete object?</AlertDialogTitle>
            <AlertDialogDescription>
              Removes{" "}
              <span className="font-mono font-medium">
                {deleteTarget?.key ?? "this object"}
              </span>{" "}
              from <span className="font-mono">{bucket}</span>. Storage delete
              failures keep the metadata row so you can retry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void deleteObject()}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={preview != null}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
      >
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle className="truncate font-mono text-base">
              {preview?.object.key}
            </DialogTitle>
            <DialogDescription>
              {preview?.object.content_type} ·{" "}
              {formatBytes(preview?.object.size ?? 0)}
            </DialogDescription>
          </DialogHeader>

          {preview?.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={objectUrl(bucket, preview.object.key)}
              alt={preview.object.key}
              className="max-h-[70vh] w-full rounded-md border border-border object-contain"
            />
          ) : null}
          {preview?.kind === "pdf" ? (
            <iframe
              title={`Preview ${preview.object.key}`}
              src={objectUrl(bucket, preview.object.key)}
              className="h-[70vh] w-full rounded-md border border-border"
            />
          ) : null}
          {preview?.kind === "text" ? (
            preview.textError ? (
              <p className="text-sm text-destructive">{preview.textError}</p>
            ) : preview.text == null ? (
              <p className="text-sm text-muted-foreground">Loading preview…</p>
            ) : (
              <pre className="max-h-[60vh] overflow-auto rounded-md border border-border bg-muted/30 p-3 font-mono text-[11px]">
                {preview.text}
              </pre>
            )
          ) : null}

          <DialogFooter>
            {preview ? (
              <Button type="button" variant="outline" asChild>
                <a
                  href={objectUrl(bucket, preview.object.key)}
                  download={preview.object.key.split("/").pop()}
                >
                  Download
                </a>
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
