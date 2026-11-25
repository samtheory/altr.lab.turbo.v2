"use client";

import { SpotlightBeam } from "@altr/apolyx";

export default function SpotlightBeamDemo() {
  return (
    <SpotlightBeam className="flex h-48 w-full max-w-lg items-center justify-center rounded-xl border border-border">
      <p className="relative z-[1] text-sm font-medium">Under the beam</p>
    </SpotlightBeam>
  );
}
