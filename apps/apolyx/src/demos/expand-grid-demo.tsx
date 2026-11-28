"use client";

import { ExpandGrid } from "@altr/apolyx";

export default function Demo() {
  return (
    <ExpandGrid
      className="max-w-3xl"
      items={[
        {
          id: "ingest",
          title: "Ingest",
          description: "Stream events into the workspace.",
          content: <div className="h-24 rounded-lg bg-muted" />,
        },
        {
          id: "route",
          title: "Route",
          description: "Pick the right agent for the job.",
        },
        {
          id: "review",
          title: "Review",
          description: "Approve plans before they run.",
          content: <div className="h-32 rounded-lg bg-accent" />,
        },
        {
          id: "audit",
          title: "Audit",
          description: "Replay decisions with full context.",
        },
      ]}
    />
  );
}