"use client";

import { Info, Sparkles } from "lucide-react";
import {
  Badge,
  SwitchField,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@altr/apolyx";

export default function SwitchCompositionDemo() {
  return (
    <div className="grid w-full max-w-sm gap-5">
      <SwitchField
        label="Usage analytics"
        description="Anonymous counts only."
        aside={
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="What we collect"
                className="rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Info className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Page views and feature usage, never content.</TooltipContent>
          </Tooltip>
        }
      />
      <SwitchField
        label="Smart replies"
        description="Suggests short answers in threads."
        aside={
          <>
            <Badge variant="info" className="px-1.5 py-0 text-[10px]">
              Beta
            </Badge>
            <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
              Pro
            </Badge>
          </>
        }
        defaultChecked
      />
      <SwitchField
        className="items-center"
        label={
          <span className="inline-flex items-center gap-3">
            <span
              aria-hidden
              className="flex size-8 items-center justify-center rounded-md bg-primary/12 text-primary"
            >
              <Sparkles className="size-4" />
            </span>
            Writing assistant
          </span>
        }
        tone="primary"
      />
    </div>
  );
}
