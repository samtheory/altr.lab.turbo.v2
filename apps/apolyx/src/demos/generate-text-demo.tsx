"use client";

import { GenerateText } from "@altr/apolyx";

export default function GenerateTextDemo() {
  return (
    <GenerateText
      text="Words blur in one by one as they enter the viewport."
      className="max-w-md text-lg font-medium"
    />
  );
}