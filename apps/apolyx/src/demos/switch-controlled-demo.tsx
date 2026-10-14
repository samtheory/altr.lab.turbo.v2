"use client";

import * as React from "react";
import { SwitchField } from "@altr/apolyx";

export default function SwitchControlledDemo() {
  const [enabled, setEnabled] = React.useState(true);
  return (
    <div className="grid w-full max-w-sm gap-3">
      <SwitchField
        label="Auto-save"
        description="Saves the document every few seconds."
        checked={enabled}
        onCheckedChange={setEnabled}
      />
      <p className="rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
        checked: <span className="text-foreground">{String(enabled)}</span>
      </p>
    </div>
  );
}
