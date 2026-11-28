"use client";

import { HoverGrid, HoverGridItem } from "@altr/apolyx";

export default function HoverGridDemo() {
  return (
    <HoverGrid className="max-w-md">
      {["Alpha", "Beta", "Gamma"].map((label, index) => (
        <HoverGridItem key={label} index={index}>
          <p className="text-sm font-medium">{label}</p>
        </HoverGridItem>
      ))}
    </HoverGrid>
  );
}