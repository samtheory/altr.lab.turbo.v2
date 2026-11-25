"use client";
import { AgentHandoff } from "@altr/apolyx";
export default function Demo() {
  return (
    <div className="flex w-full justify-center p-4">
      <AgentHandoff autoPlay />
    </div>
  );
}
