"use client";

import { HoverLift } from "@altr/apolyx";

export default function HoverLiftDemo() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {["Analytics", "Deployments"].map((title) => (
        <HoverLift key={title} className="rounded-xl border border-border bg-card p-5">
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">Hover with a mouse to lift.</p>
        </HoverLift>
      ))}
    </div>
  );
}
