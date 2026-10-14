"use client";

import * as React from "react";
import { TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle, SwitchCard } from "@altr/apolyx";

export default function SwitchConfirmAlertDemo() {
  const [wipe, setWipe] = React.useState(false);
  return (
    <div className="grid w-full max-w-sm gap-3">
      <SwitchCard
        tone="destructive"
        title="Clear data on sign-out"
        description="Removes cached files from this browser."
        checked={wipe}
        onCheckedChange={setWipe}
      />
      {wipe ? (
        <Alert variant="destructive">
          <TriangleAlert className="size-4" />
          <AlertTitle>This deletes local data</AlertTitle>
          <AlertDescription>Unsynced drafts are lost the next time you sign out.</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
