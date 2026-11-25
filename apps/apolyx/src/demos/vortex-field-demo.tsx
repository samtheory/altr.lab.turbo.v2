"use client";

import { VortexField } from "@altr/apolyx";

export default function Demo() {
  return (
    <VortexField className="flex h-48 w-full max-w-lg items-center justify-center rounded-xl border border-border">
      <span className="relative z-[1] rounded-full border border-border/80 bg-background/70 px-3 py-1 text-xs font-medium text-foreground backdrop-blur-sm">
        Vortex Field
      </span>
    </VortexField>
  );
}
