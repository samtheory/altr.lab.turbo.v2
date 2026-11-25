"use client";
import { ModelPicker } from "@altr/apolyx";
export default function Demo() {
  return (
    <div className="flex h-[300px] w-full max-w-md items-end p-4">
      <div className="w-full rounded-2xl border border-border bg-card p-3 shadow-xs">
        <p className="px-1 pb-3 text-sm text-muted-foreground">Ask anything…</p>
        <ModelPicker autoPlay />
      </div>
    </div>
  );
}
