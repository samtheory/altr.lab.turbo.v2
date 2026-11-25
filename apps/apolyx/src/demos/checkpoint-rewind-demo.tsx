"use client";
import { CheckpointRewind } from "@altr/apolyx";
export default function Demo() {
  return (
    <div className="flex w-full justify-center p-4">
      <CheckpointRewind autoPlay />
    </div>
  );
}
