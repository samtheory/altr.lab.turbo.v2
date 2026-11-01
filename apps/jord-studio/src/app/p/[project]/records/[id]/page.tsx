import Link from "next/link";
import { Alert, AlertDescription, AlertTitle, Button } from "@altr/apolyx";

import { RecordDetail } from "@/components/record-detail";
import { getSession } from "@/lib/auth/session";
import { proxyToJord } from "@/lib/jord-proxy";
import type { ApiErrorBody, PublicRecord } from "@/lib/records";

type Props = {
  params: Promise<{ project: string; id: string }>;
};

export default async function RecordPage({ params }: Props) {
  const { project, id } = await params;
  const backHref = `/p/${encodeURIComponent(project)}/records`;
  const session = await getSession();
  const role = session?.role ?? "readonly";

  let record: PublicRecord | null = null;
  let loadError: string | null = null;

  const res = await proxyToJord(`/records/${encodeURIComponent(id)}`);
  if (res.status === 503) {
    const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
    loadError =
      body.message ??
      "Cannot reach jord-server. Start it with `pnpm dev:jord`, then reload this page.";
  } else if (res.status === 404) {
    loadError = "Record not found.";
  } else if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
    loadError = body.message ?? `Failed to load (${res.status}).`;
  } else {
    record = (await res.json()) as PublicRecord;
  }

  if (loadError || !record) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-16 sm:px-6">
        <Alert variant="destructive">
          <AlertTitle>Could not open record</AlertTitle>
          <AlertDescription>{loadError ?? "Unknown error."}</AlertDescription>
        </Alert>
        <Button asChild variant="outline">
          <Link href={backHref}>Back to list</Link>
        </Button>
      </div>
    );
  }

  return <RecordDetail initial={record} role={role} />;
}
