"use client";

import { StepLoader } from "@altr/apolyx";

const STEPS = [
  { label: "Connect workspace", description: "Handshake with the project vault." },
  { label: "Sync tokens", description: "Pull theme families and modes." },
  { label: "Hydrate components", description: "Warm the registry cache." },
  { label: "Ready", description: "Docs and playground are live." },
];

export default function StepLoaderDemo() {
  return (
    <StepLoader
      className="w-full max-w-sm"
      steps={STEPS}
      duration={1400}
      loop
    />
  );
}
