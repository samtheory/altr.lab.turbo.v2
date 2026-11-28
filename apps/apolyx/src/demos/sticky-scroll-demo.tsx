"use client";

import { StickyScroll } from "@altr/apolyx";

function Placeholder({ label }: { label: string }) {
  return (
    <div className="flex h-40 w-full items-center justify-center rounded-lg bg-muted text-sm font-medium text-muted-foreground">
      {label}
    </div>
  );
}

export default function Demo() {
  return (
    <div className="w-full max-w-3xl">
        <StickyScroll
          panelPosition="left"
          items={[
            {
              title: "Collect context",
              description: "Agents pull live schema, policies, and docs before they act.",
              content: <Placeholder label="Context panel" />,
            },
            {
              title: "Plan safely",
              description: "Human-readable steps with guardrails before execution.",
              content: <Placeholder label="Plan preview" />,
            },
            {
              title: "Ship with proof",
              description: "Every run leaves an audit trail you can replay.",
              content: <Placeholder label="Proof trace" />,
            },
          ]}
        />
    </div>
  );
}