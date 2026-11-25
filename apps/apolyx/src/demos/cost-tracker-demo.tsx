"use client";
import { CostTracker } from "@altr/apolyx";
export default function Demo() {
  return (
    <div className="flex w-full justify-center p-4">
      <CostTracker autoPlay />
    </div>
  );
}
