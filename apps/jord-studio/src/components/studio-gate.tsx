import Link from "next/link";
import { Alert, AlertDescription, AlertTitle, Button } from "@altr/apolyx";

type Props = {
  reason?: "missing-token" | "signed-out";
};

export function StudioBlocked({ reason = "signed-out" }: Props) {
  if (reason === "missing-token") {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center gap-6 px-4 py-16">
        <p className="font-display text-3xl font-semibold tracking-tight">Jord Studio</p>
        <Alert variant="destructive">
          <AlertTitle>Auth not configured</AlertTitle>
          <AlertDescription>
            Set <code className="font-mono text-sm">JORD_SERVER_TOKEN</code> (and{" "}
            <code className="font-mono text-sm">JORD_STUDIO_PASSWORD</code> for login) in{" "}
            <code className="font-mono text-sm">apps/jord-studio/.env.local</code>, matching{" "}
            <code className="font-mono text-sm">jord-server</code>. See{" "}
            <code className="font-mono text-sm">.env.example</code>.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center gap-6 px-4 py-16">
      <p className="font-display text-3xl font-semibold tracking-tight">Jord Studio</p>
      <Alert variant="warning">
        <AlertTitle>Sign in required</AlertTitle>
        <AlertDescription>
          Studio S3 uses sessions. Open the login page, or set{" "}
          <code className="font-mono text-sm">JORD_STUDIO_OPEN=1</code> for a lab-only bypass.
        </AlertDescription>
      </Alert>
      <Button asChild>
        <Link href="/login">Go to sign in</Link>
      </Button>
    </div>
  );
}
