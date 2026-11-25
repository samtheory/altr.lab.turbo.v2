"use client";

import { GlowFrame } from "@altr/apolyx";

export default function GlowFrameDemo() {
  return (
    <GlowFrame className="w-full max-w-xs">
      <div className="p-6 text-sm text-muted-foreground">
        Soft bloom plus a traveling primary border.
      </div>
    </GlowFrame>
  );
}
