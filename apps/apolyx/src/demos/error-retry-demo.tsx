"use client";
import { ErrorRetry } from "@altr/apolyx";
export default function Demo() {
  return (
    <div className="flex w-full justify-center p-4">
      <ErrorRetry autoPlay />
    </div>
  );
}
