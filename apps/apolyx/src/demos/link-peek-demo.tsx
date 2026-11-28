"use client";

import { LinkPeek } from "@altr/apolyx";

export default function LinkPeekDemo() {
  return (
    <p className="text-sm">
      Read the{" "}
      <LinkPeek
        href="https://apolyx.dev"
        title="Apolyx"
        description="Semantic UI kit for product teams."
        image="https://images.unsplash.com/photo-1557683316-973673baf926?w=400&h=200&fit=crop"
      >
        Apolyx docs
      </LinkPeek>{" "}
      for patterns and tokens.
    </p>
  );
}