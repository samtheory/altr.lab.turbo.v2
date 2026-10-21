import { Alert, AlertDescription, AlertTitle } from "@altr/apolyx";

export default function HelpPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Local lab gate</h1>
        <p className="text-sm text-muted-foreground">
          Studio S1 / S1.5 is single-machine only. Real auth is Studio S3.
        </p>
      </div>

      <Alert variant="warning">
        <AlertTitle>Not for production</AlertTitle>
        <AlertDescription>
          Set <code className="font-mono">JORD_STUDIO_OPEN=1</code> in{" "}
          <code className="font-mono">.env.local</code> to use Studio. Do not expose port 3005 beyond
          your machine.
        </AlertDescription>
      </Alert>

      <Alert variant="info">
        <AlertTitle>Vault docs</AlertTitle>
        <AlertDescription>
          Product intent and as-built notes live in the Obsidian vault under{" "}
          <code className="font-mono">Docs/feature_list/Jord/</code> and{" "}
          <code className="font-mono">Docs/tech_space/jord/</code> — not inside this app.
        </AlertDescription>
      </Alert>
    </div>
  );
}
