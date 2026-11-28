"use client";

import { CardPack } from "@altr/apolyx";

export default function CardPackDemo() {
  return (
    <CardPack
      items={[
        { id: "1", content: "One" },
        { id: "2", content: "Two" },
        { id: "3", content: "Three" },
      ]}
    />
  );
}