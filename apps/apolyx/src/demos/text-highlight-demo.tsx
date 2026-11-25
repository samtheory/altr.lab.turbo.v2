"use client";

import { TextHighlight } from "@altr/apolyx";

export default function TextHighlightDemo() {
  return (
    <p className="max-w-md p-4 text-xl leading-relaxed">
      Design the small moments that make people{" "}
      <TextHighlight>come back again</TextHighlight>.
    </p>
  );
}
