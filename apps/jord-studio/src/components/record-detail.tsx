"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  cn,
} from "@altr/apolyx";

import { InspectorFooter } from "@/components/inspector-chrome";
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
  layout?: "page" | "inspector";
  onClose?: () => void;
};

export function RecordDetail({
  initial,
  role,
  layout = "page",
  onClose,
}: Props) {
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
  const isInspector = layout === "inspector";

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
        const res = await fetch(
          `/api/records/${encodeURIComponent(record.id)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              version: record.version,
              body,
              metadata: metadata.trim() === "" ? null : metadata,
              bucket,
            }),
          },
        );

        if (res.status === 409) {
          setConflict(true);
          setError(
            "Version conflict (409). Reloading the latest row — your edit was not applied.",
          );
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
        setError(
          err instanceof Error
            ? err.message
            : "Network error talking to Studio BFF.",
        );
      }
    });
  }

  const actions = (
    <>
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
      {isInspector && onClose ? (
        <Button type="button" variant="ghost" onClick={onClose}>
          Close
        </Button>
      ) : null}
    </>
  );

  return (
    <form
      onSubmit={onSave}
      className={cn(
        "flex flex-col",
        isInspector
          ? "min-h-full"
          : "mx-auto max-w-2xl gap-6 px-4 py-8 sm:px-6",
      )}
    >
      <div
        className={cn(
          "flex flex-col",
          isInspector ? "gap-4 px-4 py-4" : "gap-6",
        )}
      >
        {!isInspector ? (
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
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              records
            </h1>
            <p className="break-all font-mono text-xs text-muted-foreground">
              {record.id}
            </p>
          </div>
        ) : (
          <p className="break-all font-mono text-xs text-muted-foreground">
            {record.id}
          </p>
        )}

        {!canWrite ? (
          <Alert variant="warning">
            <AlertTitle>Read-only session</AlertTitle>
            <AlertDescription>
              Role <code className="font-mono">{role}</code> cannot save row
              changes.
            </AlertDescription>
          </Alert>
        ) : null}

        {conflict ? (
          <Alert variant="warning">
            <AlertTitle>OCC conflict</AlertTitle>
            <AlertDescription>
              Someone else (or a stale tab) saved first. The form now shows the
              server row; re-apply your changes and save again.
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

        {!isInspector ? (
          <div className="flex flex-wrap gap-3">{actions}</div>
        ) : null}
      </div>
      {isInspector ? <InspectorFooter>{actions}</InspectorFooter> : null}
    </form>
  );
}
