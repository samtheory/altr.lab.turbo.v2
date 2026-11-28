"use client";

import { LayoutFlip } from "@altr/apolyx";

export default function LayoutFlipDemo() {
  return (
    <p className="text-2xl">
      Build <LayoutFlip words={["faster", "prettier", "accessibly"]} className="text-primary" />
    </p>
  );
}