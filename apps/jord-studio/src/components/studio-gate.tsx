import { Alert, AlertDescription, AlertTitle } from "@altr/apolyx";

export function StudioBlocked() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center gap-6 px-4 py-16">
      <p className="font-display text-3xl font-semibold tracking-tight">Jord Studio</p>
      <Alert variant="destructive">
        <AlertTitle>Studio is gated</AlertTitle>
        <AlertDescription>
          Set <code className="font-mono text-sm">JORD_STUDIO_OPEN=1</code> in{" "}
          <code className="font-mono text-sm">apps/jord-studio/.env.local</code> (see{" "}
          <code className="font-mono text-sm">.env.example</code>), then restart{" "}
          <code className="font-mono text-sm">pnpm dev:jord-studio</code>.
        </AlertDescription>
      </Alert>
    </div>
  );
}
