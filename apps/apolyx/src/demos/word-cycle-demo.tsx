"use client";

import { WordCycle } from "@altr/apolyx";

export default function Demo() {
  return (
    <p className="text-2xl font-semibold">
      Ship <WordCycle words={["faster", "prettier", "accessibly"]} />
    </p>
  );
}