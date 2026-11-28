"use client";

import { VanishInput } from "@altr/apolyx";

export default function VanishInputDemo() {
  return (
    <VanishInput
      placeholders={["Ask anything…", "Ship a component…", "Try Apolyx…"]}
      onSubmit={(v) => console.log(v)}
    />
  );
}