"use client";

import { Separator } from "@altr/apolyx";

export default function SeparatorDemo() {
  return (
    <div className="w-full max-w-sm">
      <p className="font-medium">Apolyx</p>
      <p className="text-sm text-muted-foreground">An ownable UI kit.</p>
      <Separator className="my-4" />
      <div className="flex h-5 items-center gap-4 text-sm">
        <span>Docs</span>
        <Separator orientation="vertical" />
        <span>Components</span>
        <Separator orientation="vertical" />
        <span>CLI</span>
      </div>
    </div>
  );
}
