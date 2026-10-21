"use client";

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
import type { ApiErrorBody, PublicRecord } from "@/lib/records";

export function CreateRecordForm() {
  const router = useRouter();
  const [bucket, setBucket] = useState("lab");
  const [body, setBody] = useState('{\n  "hello": "jord"\n}');
  const [metadata, setMetadata] = useState("");
  const [validateJson, setValidateJson] = useState(true);
  const [bodyError, setBodyError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
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
        router.push(`/records/${row.id}`);
        router.refresh();
      } catch {
        setError("Network error talking to Studio BFF.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Table · records
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Insert row</h1>
        <p className="text-sm text-muted-foreground">
          Column fields map to SQL <code className="font-mono">INSERT</code> via jord-server (libSQL).
          Not a document database.
        </p>
      </div>

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

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Inserting…" : "Insert row"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/records")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
