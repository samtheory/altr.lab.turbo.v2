"use client";

import { RevealCard } from "@altr/apolyx";

export default function RevealCardDemo() {
  return (
    <RevealCard
      className="max-w-xs"
      reveal={<p className="text-sm text-muted-foreground">Extra copy on hover</p>}
    >
      <p className="font-medium">Surface</p>
    </RevealCard>
  );
}