"use client";

import * as React from "react";
import { CalendarClock } from "lucide-react";

import { cn } from "../../lib/utils";
import { useId } from "../../primitives/use-id";
import { Label } from "./label";
import { Switch } from "./switch";

export type ScheduledTriggerProps = {
  title?: string;
  schedule?: string;
  scheduleLabel?: string;
  nextRun?: string;
  enabled?: boolean;
  defaultEnabled?: boolean;
  onEnabledChange?: (enabled: boolean) => void;
  className?: string;
};

/** Cron / schedule trigger card with enable toggle and next run time. */
export function ScheduledTrigger({
  title = "Scheduled trigger",
  schedule = "0 9 * * 1-5",
  scheduleLabel = "Cron expression",
  nextRun = "Mon 09:00 · America/Chicago",
  enabled: enabledProp,
  defaultEnabled = true,
  onEnabledChange,
  className,
}: ScheduledTriggerProps) {
  const switchId = useId();
  const [uncontrolled, setUncontrolled] = React.useState(defaultEnabled);
  const enabled = enabledProp ?? uncontrolled;

  function setEnabled(next: boolean) {
    if (enabledProp === undefined) setUncontrolled(next);
    onEnabledChange?.(next);
  }

  return (
    <div
      data-slot="scheduled-trigger"
      className={cn(
        "w-full max-w-sm rounded-xl border border-border bg-card p-4 text-foreground shadow-xs",
        className,
      )}
    >
      <div className="mb-3 flex items-start gap-2.5">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-muted text-muted-foreground"
          aria-hidden
        >
          <CalendarClock className="size-4" strokeWidth={2.5} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">{schedule}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Label htmlFor={switchId} className="text-[11px] text-muted-foreground">
            Enabled
          </Label>
          <Switch id={switchId} checked={enabled} onCheckedChange={setEnabled} size="sm" />
        </div>
      </div>
      <dl className="space-y-1.5 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">{scheduleLabel}</dt>
          <dd className="font-mono">{schedule}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Next run</dt>
          <dd className="font-medium">{enabled ? nextRun : "Paused"}</dd>
        </div>
      </dl>
    </div>
  );
}