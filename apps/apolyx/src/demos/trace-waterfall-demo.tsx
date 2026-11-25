"use client";
import { TraceWaterfall } from "@altr/apolyx";
export default function Demo() {
  return (
    <div className="flex w-full justify-center p-2 sm:p-4">
      <TraceWaterfall autoPlay className="max-w-md" />
    </div>
  );
}
