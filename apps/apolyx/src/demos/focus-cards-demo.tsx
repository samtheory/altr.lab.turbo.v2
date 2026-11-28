"use client";

import { FocusCards } from "@altr/apolyx";

export default function FocusCardsDemo() {
  return (
    <FocusCards
      items={[
        { title: "Design", description: "Tokens and motion" },
        { title: "Build", description: "Kit-first apps" },
        { title: "Ship", description: "Docs and registry" },
      ]}
    />
  );
}