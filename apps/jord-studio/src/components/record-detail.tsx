"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
} from "@altr/apolyx";

import {
  RecordRowFields,
  validateBodyJson,
} from "@/components/record-row-fields";
import { useProjectHref } from "@/hooks/use-project-path";
import { canWriteRecords, type JordRole } from "@/lib/auth/roles";
import type { ApiErrorBody, PublicRecord } from "@/lib/records";

type Props = {
  initial: PublicRecord;
  role: JordRole;
};

export function RecordDetail({ initial, role }: Props) {
  const router = useRouter();
  const hrefFor = useProjectHref();
  const canWrite = canWriteRecords(role);
  const [record, setRecord] = useState(initial);
  const [body, setBody] = useState(initial.body);
  const [metadata, setMetadata] = useState(initial.metadata ?? "");
  const [bucket, setBucket] = useState(initial.bucket);
  const [validateJson, setValidateJson] = useState(false);
  const [bodyError, setBodyError] = useState<string | null>(null);
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
    if (!canWrite) {
      setError(`Role "${role}" cannot write records.`);
      return;
    }
    setError(null);
    setConflict(false);
    setSaved(false);
    const jsonErr = validateBodyJson(body, validateJson);
    setBodyError(jsonErr);
    if (jsonErr) return;

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
    <form onSubmit={onSave} className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          <Link
            href={hrefFor("/records")}
            className="underline-offset-4 hover:underline"
          >
            ← Table · records
          </Link>
        </p>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Edit row
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">records</h1>
        <p className="font-mono text-xs text-muted-foreground break-all">{record.id}</p>
      </div>

      {!canWrite ? (
        <Alert variant="warning">
          <AlertTitle>Read-only session</AlertTitle>
          <AlertDescription>
            Role <code className="font-mono">{role}</code> cannot save row changes.
          </AlertDescription>
        </Alert>
      ) : null}

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
            Column <code className="font-mono">version</code> is now{" "}
            <span className="font-mono tabular-nums">{record.version}</span>.
          </AlertDescription>
        </Alert>
      ) : null}

      <RecordRowFields
        mode="edit"
        record={record}
        bucket={bucket}
        onBucketChange={setBucket}
        body={body}
        onBodyChange={(v) => {
          setBody(v);
          setBodyError(null);
        }}
        metadata={metadata}
        onMetadataChange={setMetadata}
        validateJson={validateJson}
        onValidateJsonChange={setValidateJson}
        bodyError={bodyError}
      />

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isPending || !canWrite}>
          {isPending ? "Saving…" : "Save row"}
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
              setBodyError(null);
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
