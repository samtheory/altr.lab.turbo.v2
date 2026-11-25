"use client";

import { BorderGlow } from "@altr/apolyx";

export default function Demo() {
  return (
    <BorderGlow className="max-w-xs">
      <div className="p-6 text-sm text-muted-foreground">
        Traveling border glow using semantic primary tokens.
      </div>
    </BorderGlow>
  );
}