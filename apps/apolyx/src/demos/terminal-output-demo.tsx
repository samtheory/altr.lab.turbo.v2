"use client";
import { TerminalOutput } from "@altr/apolyx";
export default function Demo() {
  return (
    <div className="flex justify-center p-4">
      <TerminalOutput autoPlay />
    </div>
  );
}
