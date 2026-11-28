"use client";

import { CanvasReveal } from "@altr/apolyx";

export default function CanvasRevealDemo() {
  return (
    <CanvasReveal className="w-full max-w-md">
      <p className="text-lg font-semibold text-foreground">Revealed content</p>
      <p className="mt-1 text-sm text-muted-foreground">Move the pointer across the dot matrix.</p>
    </CanvasReveal>
  );
}