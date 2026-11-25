"use client";

import { TextSwap } from "@altr/apolyx";

export default function TextSwapDemo() {
  return (
    <div className="p-4 text-xl font-semibold leading-snug tracking-tight">
      <TextSwap
        beforeText={"Good ideas start small,\nsketched after midnight."}
        afterText={"Great products ship when\nthat sketch becomes a screen."}
        delay={0.8}
      />
    </div>
  );
}
