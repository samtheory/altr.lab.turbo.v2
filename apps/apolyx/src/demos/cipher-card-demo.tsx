"use client";

import { CipherCard } from "@altr/apolyx";

export default function CipherCardDemo() {
  return (
    <CipherCard className="max-w-xs">
      <p className="text-sm text-muted-foreground">Hover to scramble</p>
    </CipherCard>
  );
}