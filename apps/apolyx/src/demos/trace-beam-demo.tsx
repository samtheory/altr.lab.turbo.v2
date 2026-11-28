"use client";

import { TraceBeam } from "@altr/apolyx";

export default function Demo() {
  return (
    <TraceBeam className="max-w-lg">
      {[
        "Wire the beam to long-form content.",
        "Scroll inside the docs preview or the page.",
        "Reduced motion shows a static fill.",
      ].map((line) => (
        <p key={line} className="mb-16 text-sm text-pretty text-muted-foreground last:mb-0">
          {line}
        </p>
      ))}
    </TraceBeam>
  );
}