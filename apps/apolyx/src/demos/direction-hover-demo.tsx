"use client";

import { DirectionHover } from "@altr/apolyx";

export default function DirectionHoverDemo() {
  return (
    <DirectionHover overlay={<span className="px-4 text-sm font-medium">Revealed</span>}>
      <div className="p-8 text-sm text-muted-foreground">Enter from any edge</div>
    </DirectionHover>
  );
}