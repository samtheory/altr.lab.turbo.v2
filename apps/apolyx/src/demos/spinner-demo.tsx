"use client";

import { Button, Spinner } from "@altr/apolyx";

export default function SpinnerDemo() {
  return (
    <div className="flex items-center gap-6">
      <Spinner />
      <Spinner label="Syncing workspace" className="[&_svg]:size-6" />
      <Button loading>Saving</Button>
    </div>
  );
}
