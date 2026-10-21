"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Field,
  FieldInput,
  FieldTextarea,
} from "@altr/apolyx";

import { formatMs, type ApiErrorBody, type PublicRecord } from "@/lib/records";

type Props = {
  initial: PublicRecord;
};

export function RecordDetail({ initial }: Props) {
  const router = useRouter();
  const [record, setRecord] = useState(initial);
  const [body, setBody] = useState(initial.body);
  const [metadata, setMetadata] = useState(initial.metadata ?? "");
  const [bucket, setBucket] = useState(initial.bucket);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function reloadLatest() {
    const res = await fetch(`/api/records/${encodeURIComponent(record.id)}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as ApiErrorBody;
      throw new Error(err.message ?? `Reload failed (${res.status}).`);
    }
    const latest = (await res.json()) as PublicRecord;
    setRecord(latest);
    setBody(latest.body);
    setMetadata(latest.metadata ?? "");
    setBucket(latest.bucket);
    return latest;
  }

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setConflict(false);
    setSaved(false);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/records/${encodeURIComponent(record.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            version: record.version,
            body,
            metadata: metadata.trim() === "" ? null : metadata,
            bucket,
          }),
        });

        if (res.status === 409) {
          setConflict(true);
          setError("Version conflict (409). Reloading the latest row — your edit was not applied.");
          await reloadLatest();
          return;
        }

        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as ApiErrorBody;
          setError(err.message ?? `Save failed (${res.status}).`);
          return;
        }

        const next = (await res.json()) as PublicRecord;
        setRecord(next);
        setBody(next.body);
        setMetadata(next.metadata ?? "");
        setBucket(next.bucket);
        setSaved(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Network error talking to Studio BFF.");
      }
    });
  }

  return (
    <form onSubmit={onSave} className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          <Link href="/records" className="underline-offset-4 hover:underline">
            ← Records
          </Link>
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Record</h1>
        <p className="font-mono text-xs text-muted-foreground break-all">{record.id}</p>
      </div>

      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">version</dt>
          <dd className="font-mono tabular-nums">{record.version}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">updated_at</dt>
          <dd>{formatMs(record.updated_at)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">created_at</dt>
          <dd>{formatMs(record.created_at)}</dd>
        </div>
      </dl>

      {conflict ? (
        <Alert variant="warning">
          <AlertTitle>OCC conflict</AlertTitle>
          <AlertDescription>
            Someone else (or a stale tab) saved first. The form now shows the server row; re-apply
            your changes and save again.
          </AlertDescription>
        </Alert>
      ) : null}

      {error && !conflict ? (
        <Alert variant="destructive">
          <AlertTitle>Save failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {error && conflict ? (
        <Alert variant="info">
          <AlertTitle>Conflict details</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {saved ? (
        <Alert variant="success">
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>
            Version is now <span className="font-mono tabular-nums">{record.version}</span>.
          </AlertDescription>
        </Alert>
      ) : null}

      <Field label="Bucket" required>
        <FieldInput value={bucket} onChange={(e) => setBucket(e.target.value)} />
      </Field>

      <Field label="Body" required>
        <FieldTextarea
          rows={12}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="font-mono text-sm"
        />
      </Field>

      <Field label="Metadata" optional>
        <FieldInput
          value={metadata}
          onChange={(e) => setMetadata(e.target.value)}
          placeholder="optional"
        />
      </Field>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              setError(null);
              setConflict(false);
              setSaved(false);
              try {
                await reloadLatest();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Reload failed.");
              }
            });
          }}
        >
          Reload
        </Button>
      </div>
    </form>
  );
}
