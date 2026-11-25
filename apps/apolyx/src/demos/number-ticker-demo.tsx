"use client";

import { NumberTicker } from "@altr/apolyx";

export default function Demo() {
  return (
    <p className="text-4xl font-semibold tabular-nums">
      <NumberTicker value={12840.5} decimals={1} prefix="$" />
    </p>
  );
}