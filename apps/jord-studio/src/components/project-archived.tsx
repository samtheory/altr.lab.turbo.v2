import Link from "next/link";
import { Alert, AlertDescription, AlertTitle, Button } from "@altr/apolyx";

type Props = {
  slug: string;
  reason: string;
};

/** HTTP 410 UX for archived project slugs (S0045). */
export function ProjectArchived({ slug, reason }: Props) {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-16 sm:px-6">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Gone
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Project archived
        </h1>
      </div>
      <Alert variant="destructive">
        <AlertTitle>
          <code className="font-mono">{slug}</code> is no longer available
        </AlertTitle>
        <AlertDescription>{reason}</AlertDescription>
      </Alert>
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/projects">All projects</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/p/default/tables">Open default project</Link>
        </Button>
      </div>
    </div>
  );
}
