import Link from "next/link";
import { Alert, AlertDescription, AlertTitle, Button } from "@altr/apolyx";

type Props = { params: Promise<{ project: string }> };

/**
 * Soft landing for Open / post-create until S0045 scopes the full shell to /p/[project].
 */
export default async function ProjectHomePage({ params }: Props) {
  const { project } = await params;
  const slug = decodeURIComponent(project);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Project
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {slug}
        </h1>
        <p className="text-sm text-muted-foreground">
          Project-scoped Studio shell arrives in S0045. Until then, use the
          existing nav against the primary server database.
        </p>
      </div>

      <Alert variant="info">
        <AlertTitle>Scoped routes next</AlertTitle>
        <AlertDescription>
          Switcher, session cookie for the active project, and{" "}
          <code className="font-mono">/p/[project]/…</code> nesting land in the
          next phase-03 card.
        </AlertDescription>
      </Alert>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/tables">Open tables</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/projects">Back to projects</Link>
        </Button>
      </div>
    </div>
  );
}
