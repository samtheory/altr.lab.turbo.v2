"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { Button, cn } from "@altr/apolyx";

export function CopyButton({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(t);
  }, [copied]);

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={copied ? "Copied" : "Copy to clipboard"}
      className={cn("size-8 text-muted-foreground hover:text-foreground", className)}
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
      }}
    >
      {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
    </Button>
  );
}
