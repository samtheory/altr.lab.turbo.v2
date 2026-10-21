import { Alert, AlertDescription, AlertTitle, Badge } from "@altr/apolyx";

import { getSession } from "@/lib/auth/session";
import {
  canAlterSchema,
  canManageApis,
  canWriteRecords,
} from "@/lib/auth/roles";

export default async function HelpPage() {
  const session = await getSession();
  const role = session?.role ?? "readonly";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Session · role</h1>
        <p className="text-sm text-muted-foreground">
          Studio S3–S4 feature roles. SQL policies / RLS remain Studio S7.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3">
        <span className="text-sm text-muted-foreground">Current role</span>
        <Badge variant="secondary" className="font-mono uppercase">
          {role}
        </Badge>
        {session?.bypass ? (
          <Badge variant="outline" className="text-[10px] uppercase">
            env bypass
          </Badge>
        ) : null}
      </div>

      <Alert variant="info">
        <AlertTitle>Capabilities</AlertTitle>
        <AlertDescription>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
            <li>Read records / schema / generated API catalog: yes</li>
            <li>Write records (incl. DELETE): {canWriteRecords(role) ? "yes" : "no"}</li>
            <li>ADD COLUMN: {canAlterSchema(role) ? "yes" : "no"}</li>
            <li>
              Toggle generated API: {canManageApis(role) ? "yes" : "no"}
            </li>
          </ul>
        </AlertDescription>
      </Alert>

      <Alert variant="warning">
        <AlertTitle>Not for production</AlertTitle>
        <AlertDescription>
          Lab operator password + shared <code className="font-mono">JORD_SERVER_TOKEN</code>. Do not
          expose ports 3005 / 8787 beyond your machine. Optional{" "}
          <code className="font-mono">JORD_STUDIO_OPEN=1</code> skips the login page.
        </AlertDescription>
      </Alert>

      <Alert variant="info">
        <AlertTitle>Vault docs</AlertTitle>
        <AlertDescription>
          Plan: <code className="font-mono">Docs/plan/Jord/Jord-S0006/</code> · intent{" "}
          <code className="font-mono">Docs/feature_list/Jord/03-jord-studio</code>.
        </AlertDescription>
      </Alert>
    </div>
  );
}
