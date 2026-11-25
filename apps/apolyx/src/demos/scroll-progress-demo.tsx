"use client";

import { ScrollProgress } from "@altr/apolyx";

export default function Demo() {
  return (
    <>
      <ScrollProgress markers={[0.25, 0.5, 0.75]} gradient track height={5} />
      <p className="text-sm text-pretty text-muted-foreground">
        Scroll this docs page — gradient progress with section markers tracks viewport scroll.
      </p>
    </>
  );
}