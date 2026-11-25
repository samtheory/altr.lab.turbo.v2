"use client";

import { PatternHex } from "@altr/apolyx";

export default function Demo() {
  return (
    <PatternHex
      vignette
      opacity={0.55}
      size={22}
      className="h-44 w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="flex min-h-44 flex-col justify-center gap-2 p-8">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pattern</p>
        <h3 className="text-2xl font-semibold tracking-tight">Honeycomb hero backdrop</h3>
        <p className="max-w-md text-sm text-pretty text-muted-foreground">
          Full-bleed subtle stroke tile with vignette for marketing heroes.
        </p>
      </div>
    </PatternHex>
  );
}