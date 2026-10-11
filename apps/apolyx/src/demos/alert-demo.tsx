"use client";

import { Alert, AlertDescription, AlertTitle } from "@altr/apolyx";

export default function AlertDemo() {
  return (
    <div className="grid w-full max-w-lg gap-3">
      <Alert>
        <AlertTitle>Heads up</AlertTitle>
        <AlertDescription>Deploys pause during the maintenance window.</AlertDescription>
      </Alert>
      <Alert variant="success">
        <AlertTitle>Published</AlertTitle>
        <AlertDescription>Version 2.4 is live.</AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <AlertTitle>Payment failed</AlertTitle>
        <AlertDescription>Update your card to keep the workspace active.</AlertDescription>
      </Alert>
    </div>
  );
}
