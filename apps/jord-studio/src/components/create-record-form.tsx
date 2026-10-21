"use client";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@altr/apolyx";

import type { ApiErrorBody, PublicRecord } from "@/lib/records";

const BUCKET_OPTIONS = ["lab", "artemis", "jord"] as const;

export function CreateRecordForm() {
  const router = useRouter();
  const [bucket, setBucket] = useState("lab");
  const [body, setBody] = useState('{\n  "hello": "jord"\n}');
  const [metadata, setMetadata] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

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
          setError(err.message ?? `Create failed (${res.status}).`);
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
    <form onSubmit={onSubmit} className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="space-y-1">
        <h1 className="font-display text-3xl font-semibold tracking-tight">New record</h1>
        <p className="text-sm text-muted-foreground">
          POST via Studio BFF → jord-server write queue. New rows start at version 1.
        </p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Create failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Field label="Bucket" required>
        <Select value={bucket} onValueChange={setBucket}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BUCKET_OPTIONS.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Body" description="Stored as a string (JSON text is fine)." required>
        <FieldTextarea
          rows={10}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="font-mono text-sm"
        />
      </Field>

      <Field label="Metadata" optional description="Optional string; leave empty for null.">
        <FieldInput
          value={metadata}
          onChange={(e) => setMetadata(e.target.value)}
          placeholder="optional"
        />
      </Field>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating…" : "Create"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/records")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
