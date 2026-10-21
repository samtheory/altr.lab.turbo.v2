import { Suspense } from "react";
import { Alert, AlertDescription, AlertTitle } from "@altr/apolyx";

import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center gap-8 px-4 py-16">
      <div className="space-y-2">
        <p className="font-display text-3xl font-semibold tracking-tight">Jord Studio</p>
        <p className="text-sm text-muted-foreground">
          Sign in with the lab operator password. The browser never opens{" "}
          <code className="font-mono">data/jord.db</code>.
        </p>
      </div>

      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <LoginForm />
      </Suspense>

      <Alert variant="info">
        <AlertTitle>Lab credentials</AlertTitle>
        <AlertDescription>
          Set <code className="font-mono">JORD_SERVER_TOKEN</code> and{" "}
          <code className="font-mono">JORD_STUDIO_PASSWORD</code> in{" "}
          <code className="font-mono">.env.local</code>. Optional{" "}
          <code className="font-mono">JORD_STUDIO_OPEN=1</code> bypasses this page for local
          convenience.
        </AlertDescription>
      </Alert>
    </div>
  );
}
