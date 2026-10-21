"use client";

import * as React from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxTrigger,
} from "@altr/apolyx";

const symbols = [
  { value: "btc", label: "BTC — Bitcoin" },
  { value: "eth", label: "ETH — Ethereum" },
  { value: "sol", label: "SOL — Solana" },
  { value: "arb", label: "ARB — Arbitrum" },
];

export default function ComboboxDemo() {
  const [value, setValue] = React.useState("eth");
  return (
    <Combobox value={value} onValueChange={setValue}>
      <ComboboxTrigger className="w-64" aria-label="Symbol" placeholder="Search symbol" />
      <ComboboxContent inputPlaceholder="Filter symbols…">
        {symbols.map((s) => (
          <ComboboxItem key={s.value} value={s.value}>
            {s.label}
          </ComboboxItem>
        ))}
        <ComboboxEmpty>No symbol found</ComboboxEmpty>
      </ComboboxContent>
    </Combobox>
  );
}
