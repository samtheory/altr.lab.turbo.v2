"use client";

import { ExpandCard } from "@altr/apolyx";

export default function ExpandCardDemo() {
  return (
    <ExpandCard summary={<span className="font-medium">Details</span>} className="max-w-sm">
      <p className="text-sm text-muted-foreground">Expandable region with layout animation.</p>
    </ExpandCard>
  );
}