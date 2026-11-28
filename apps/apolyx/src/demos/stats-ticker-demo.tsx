"use client";

import { StatsTicker } from "@altr/apolyx";

export default function Demo() {
  return (
    <div className="flex w-full justify-center p-4">
      <StatsTicker className="max-w-5xl" />
    </div>
  );
}