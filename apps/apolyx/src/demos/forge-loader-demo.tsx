"use client";

import * as React from "react";
import { Button, ForgeLoader } from "@altr/apolyx";

export default function ForgeLoaderDemo() {
  const [key, setKey] = React.useState(0);

  return (
    <div className="flex w-full max-w-sm flex-col items-stretch gap-3">
      <ForgeLoader key={key} title="Forging image" duration={4800} />
      <Button variant="outline" size="sm" className="self-start" onClick={() => setKey((k) => k + 1)}>
        Run again
      </Button>
    </div>
  );
}
