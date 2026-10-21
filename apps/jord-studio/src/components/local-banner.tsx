import { Alert, AlertDescription, AlertTitle } from "@altr/apolyx";

import type { JordRole } from "@/lib/auth/roles";

type Props = {
  role: JordRole;
  bypass: boolean;
};

export function LocalBanner({ role, bypass }: Props) {
  return (
    <Alert variant="warning" className="rounded-none border-x-0 border-t-0">
      <AlertTitle>Local Studio — not for production</AlertTitle>
      <AlertDescription>
        Single-machine control plane · role <code className="font-mono">{role}</code>
        {bypass ? " · env bypass (JORD_STUDIO_OPEN=1)" : ""} · do not expose beyond your machine.
      </AlertDescription>
    </Alert>
  );
}
