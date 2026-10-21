import { Alert, AlertDescription, AlertTitle } from "@altr/apolyx";

export function LocalBanner() {
  return (
    <Alert variant="warning" className="rounded-none border-x-0 border-t-0">
      <AlertTitle>Local Studio — not for production</AlertTitle>
      <AlertDescription>
        Jord Studio S1 is a lab control plane. No multi-tenant auth, no roles. Do not expose this
        process beyond your machine.
      </AlertDescription>
    </Alert>
  );
}
