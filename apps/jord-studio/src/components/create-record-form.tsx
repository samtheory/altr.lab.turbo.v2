"use client";

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
  role: JordRole;
  layout?: "page" | "inspector";
  onCancel?: () => void;
  onCreated?: (recordId: string) => void;
};

export function CreateRecordForm({
  role,
  layout = "page",
  onCancel,
  onCreated,
}: Props) {
  const router = useRouter();
  const hrefFor = useProjectHref();
  const canWrite = canWriteRecords(role);
  const [bucket, setBucket] = useState("lab");
  const [body, setBody] = useState('{\n  "hello": "jord"\n}');
  const [metadata, setMetadata] = useState("");
  const [validateJson, setValidateJson] = useState(true);
  const [bodyError, setBodyError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isInspector = layout === "inspector";

  function handleCancel() {
    if (onCancel) {
      onCancel();
      return;
    }
    router.push(hrefFor("/records"));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite) {
      setError(`Role "${role}" cannot write records.`);
      return;
    }
    setError(null);
    const jsonErr = validateBodyJson(body, validateJson);
    setBodyError(jsonErr);
    if (jsonErr) return;

    startTransition(async () => {
      try {
        const res = await fetch("/api/records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bucket,
            body,
            metadata: metadata.trim() === "" ? null : metadata,
          }),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as ApiErrorBody;
          setError(err.message ?? `Insert failed (${res.status}).`);
          return;
        }
        const row = (await res.json()) as PublicRecord;
        if (onCreated) {
          onCreated(row.id);
          router.refresh();
          return;
        }
        router.push(hrefFor(`/records/${row.id}`));
        router.refresh();
      } catch {
        setError("Network error talking to Studio BFF.");
      }
    });
  }

  const actions = (
    <>
      <Button type="submit" disabled={isPending || !canWrite}>
        {isPending ? "Inserting…" : "Insert row"}
      </Button>
      <Button type="button" variant="outline" onClick={handleCancel}>
        Cancel
      </Button>
    </>
  );

  return (
    <form
      onSubmit={onSubmit}
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
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Table · records
            </p>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              Insert row
            </h1>
            <p className="text-sm text-muted-foreground">
              Column fields map to SQL <code className="font-mono">INSERT</code>{" "}
              via jord-server (libSQL). Not a document database.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Column fields map to SQL <code className="font-mono">INSERT</code>{" "}
            via jord-server.
          </p>
        )}

        {!canWrite ? (
          <Alert variant="warning">
            <AlertTitle>Read-only session</AlertTitle>
            <AlertDescription>
              Role <code className="font-mono">{role}</code> cannot insert rows.
            </AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Insert failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <RecordRowFields
          mode="insert"
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
