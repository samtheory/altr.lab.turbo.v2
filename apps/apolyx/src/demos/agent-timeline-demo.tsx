"use client";
import { AgentTimeline } from "@altr/apolyx";
export default function Demo() {
  return (
    <div className="flex w-full justify-center p-4">
      <AgentTimeline autoPlay />
    </div>
  );
}
