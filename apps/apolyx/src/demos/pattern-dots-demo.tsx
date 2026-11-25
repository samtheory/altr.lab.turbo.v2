"use client";

import { PatternDots } from "@altr/apolyx";

export default function Demo() {
  return (
    <PatternDots
      vignette
      opacity={0.7}
      className="h-44 w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="flex min-h-44 flex-col justify-center gap-2 p-8">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pattern</p>
        <h3 className="text-2xl font-semibold tracking-tight">Dot grid backdrop</h3>
        <p className="max-w-md text-sm text-pretty text-muted-foreground">
          Content sits above a muted dot field with edge fade.
        </p>
      </div>
    </PatternDots>
  );
}