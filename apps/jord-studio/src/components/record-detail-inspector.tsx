"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Skeleton,
} from "@altr/apolyx";

import { InspectorFooter } from "@/components/inspector-chrome";
import { RecordDetail } from "@/components/record-detail";
import type { JordRole } from "@/lib/auth/roles";
import type { ApiErrorBody, PublicRecord } from "@/lib/records";

type Props = {
  recordId: string;
  role: JordRole;
  onClose?: () => void;
};

/** Loads a row client-side so deep links (`?inspector=record-detail&recordId=`) work. */
export function RecordDetailInspector({ recordId, role, onClose }: Props) {
  const [record, setRecord] = useState<PublicRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setRecord(null);

    void (async () => {
      try {
        const res = await fetch(
          `/api/records/${encodeURIComponent(recordId)}`,
          { cache: "no-store" },
        );
        if (cancelled) return;
        if (res.status === 404) {
          setError("Record not found.");
          return;
        }
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
          setError(body.message ?? `Failed to load (${res.status}).`);
          return;
        }
        setRecord((await res.json()) as PublicRecord);
      } catch {
        if (!cancelled) setError("Network error talking to Studio BFF.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [recordId]);

  if (loading) {
    return (
      <div className="flex flex-col gap-3 px-4 py-4">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="flex min-h-full flex-col">
        <div className="px-4 py-4">
          <Alert variant="destructive">
            <AlertTitle>Could not open record</AlertTitle>
            <AlertDescription>{error ?? "Unknown error."}</AlertDescription>
          </Alert>
        </div>
        {onClose ? (
          <InspectorFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
          </InspectorFooter>
        ) : null}
      </div>
    );
  }

  return (
    <RecordDetail
      key={record.id}
      initial={record}
      role={role}
      layout="inspector"
      onClose={onClose}
    />
  );
}
