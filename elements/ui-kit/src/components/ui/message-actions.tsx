"use client";

import * as React from "react";
import { Check, Copy, RotateCcw, ThumbsDown, ThumbsUp } from "lucide-react";

import { cn } from "../../lib/utils";

export type MessageActionsProps = {
  text?: string;
  onCopy?: () => void;
  onRegenerate?: () => void;
  onFeedback?: (value: "up" | "down") => void;
  className?: string;
};

/** Icon row for a finished assistant message. */
export function MessageActions({
  text,
  onCopy,
  onRegenerate,
  onFeedback,
  className,
}: MessageActionsProps) {
  const [copied, setCopied] = React.useState(false);
  const [feedback, setFeedback] = React.useState<"up" | "down" | null>(null);

  async function copy() {
    if (text) {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        /* clipboard blocked */
      }
    }
    onCopy?.();
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  function vote(value: "up" | "down") {
    setFeedback(value);
    onFeedback?.(value);
  }

  return (
    <div
      data-slot="message-actions"
      className={cn("flex items-center gap-0.5 text-muted-foreground", className)}
    >
      <button
        type="button"
        aria-label={copied ? "Copied" : "Copy"}
        onClick={copy}
        className="grid size-7 place-items-center rounded-md outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
      </button>
      {onRegenerate && (
        <button
          type="button"
          aria-label="Regenerate"
          onClick={onRegenerate}
          className="grid size-7 place-items-center rounded-md outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <RotateCcw className="size-3.5" aria-hidden />
        </button>
      )}
      {onFeedback && (
        <>
          <button
            type="button"
            aria-label="Helpful"
            aria-pressed={feedback === "up"}
            onClick={() => vote("up")}
            className={cn(
              "grid size-7 place-items-center rounded-md outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
              feedback === "up" && "text-foreground",
            )}
          >
            <ThumbsUp className="size-3.5" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Not helpful"
            aria-pressed={feedback === "down"}
            onClick={() => vote("down")}
            className={cn(
              "grid size-7 place-items-center rounded-md outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
              feedback === "down" && "text-foreground",
            )}
          >
            <ThumbsDown className="size-3.5" aria-hidden />
          </button>
        </>
      )}
    </div>
  );
}
