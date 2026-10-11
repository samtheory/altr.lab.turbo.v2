"use client";

import { Pressable, toast } from "@altr/apolyx";

export default function PressableDemo() {
  return (
    <Pressable
      className="rounded-xl border border-border bg-card px-6 py-4 text-sm font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={() => toast("Pressed")}
    >
      Press and hold me
    </Pressable>
  );
}
