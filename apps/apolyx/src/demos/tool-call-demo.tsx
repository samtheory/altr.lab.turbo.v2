"use client";
import { ToolCall } from "@altr/apolyx";
export default function Demo() {
  return (
    <div className="flex justify-center p-4">
      <ToolCall autoPlay />
    </div>
  );
}
