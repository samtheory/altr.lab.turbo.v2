"use client";
import { StreamingMessage } from "@altr/apolyx";
export default function Demo() {
  return (
    <div className="flex justify-center p-4">
      <StreamingMessage autoPlay />
    </div>
  );
}
