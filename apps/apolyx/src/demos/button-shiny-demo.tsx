"use client";

import { Sparkles } from "lucide-react";
import { Button, buttonShines } from "@altr/apolyx";

const labels = {
  rainbow: "Rainbow",
  iris: "Iris",
  ocean: "Ocean",
  lime: "Lime",
  amber: "Amber",
  rose: "Rose",
} as const;

export default function ButtonShinyDemo() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="shiny">
          <Sparkles aria-hidden />
          Generate
        </Button>
        <Button variant="shiny" size="lg">
          Start trial
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {buttonShines.map((shine) => (
          <Button key={shine} variant="shiny" shine={shine}>
            {labels[shine]}
          </Button>
        ))}
      </div>
    </div>
  );
}
