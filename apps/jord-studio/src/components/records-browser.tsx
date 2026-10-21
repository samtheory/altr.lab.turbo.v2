"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Field,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@altr/apolyx";

import {
  formatMs,
  previewBody,
  type ApiErrorBody,
  type PublicRecord,
} from "@/lib/records";
import { RECORD_BUCKETS } from "@/lib/studio-nav";

type Props = {
  initialBucket?: string;
};

export function RecordsBrowser({ initialBucket = "lab" }: Props) {
  const router = useRouter();
  const [bucket, setBucket] = useState(initialBucket);
  const [rows, setRows] = useState<PublicRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    startTransition(async () => {
      setError(null);
      try {
        const res = await fetch(`/api/records?bucket=${encodeURIComponent(bucket)}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
          const msg =
            body.message ??
            (res.status === 503
              ? "jord-server is down — start `pnpm dev:jord`."
              : `Failed to load records (${res.status}).`);
          if (!cancelled) {
            setRows(null);
            setError(msg);
          }
          return;
        }
        const data = (await res.json()) as PublicRecord[];
        if (!cancelled) {
          setRows(data);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setRows(null);
          setError("Network error talking to Studio BFF.");
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [bucket]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Table editor
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            <span className="text-muted-foreground">public.</span>records
          </h1>
          <p className="text-sm text-muted-foreground">
            libSQL rows · newest first · click a row to edit columns (OCC on{" "}
            <code className="font-mono">version</code>).
          </p>
        </div>
        <Button asChild>
          <Link href="/records/new">Insert row</Link>
        </Button>
      </div>

      <Field label="bucket filter" description="WHERE bucket = ?" className="max-w-xs">
        <Select
          value={bucket}
          onValueChange={(value) => {
            setBucket(value);
            router.replace(`/records?bucket=${encodeURIComponent(value)}`);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="bucket" />
          </SelectTrigger>
          <SelectContent>
            {RECORD_BUCKETS.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load table</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!error && rows === null ? (
        <p className="text-sm text-muted-foreground">{isPending ? "Loading…" : "Loading…"}</p>
      ) : null}

      {!error && rows && rows.length === 0 ? (
        <Alert variant="info">
          <AlertTitle>No rows</AlertTitle>
          <AlertDescription>
            Table <code className="font-mono">records</code> has no rows for bucket{" "}
            <code className="font-mono">{bucket}</code>. Insert a row to seed it.
          </AlertDescription>
        </Alert>
      ) : null}

      {!error && rows && rows.length > 0 ? (
        <Table striped stickyHeader containerClassName="max-h-[70vh]">
          <TableHeader>
            <TableRow>
              <TableHead className="font-mono text-xs">id</TableHead>
              <TableHead className="font-mono text-xs">bucket</TableHead>
              <TableHead className="font-mono text-xs">version</TableHead>
              <TableHead className="font-mono text-xs">updated_at</TableHead>
              <TableHead className="font-mono text-xs">body</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer"
                onClick={() => router.push(`/records/${row.id}`)}
              >
                <TableCell className="font-mono text-xs">{row.id.slice(0, 8)}…</TableCell>
                <TableCell className="font-mono text-xs">{row.bucket}</TableCell>
                <TableCell className="tabular-nums font-mono text-xs">{row.version}</TableCell>
                <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                  {formatMs(row.updated_at)}
                </TableCell>
                <TableCell className="max-w-xs truncate font-mono text-xs">
                  {previewBody(row.body)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </div>
  );
}
