"use client";

import { PointerFollow } from "@altr/apolyx";

export default function PointerFollowDemo() {
  return (
    <PointerFollow
      title="Follow me"
      className="flex h-40 w-full max-w-md items-center justify-center rounded-xl border border-border bg-muted/20"
    >
      <p className="text-sm text-muted-foreground">Move inside this surface</p>
    </PointerFollow>
  );
}
