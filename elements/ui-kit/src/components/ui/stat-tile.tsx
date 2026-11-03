import * as React from "react";
import { AlertTriangle, CheckCircle2, OctagonAlert } from "lucide-react";

import { cn } from "../../lib/utils";
import { Skeleton } from "./skeleton";

export type StatTileStatus = "neutral" | "ok" | "warn" | "bad";

const STATUS_TEXT: Record<Exclude<StatTileStatus, "neutral">, string> = {
  ok: "Healthy",
  warn: "Warning",
  bad: "Critical",
};

export type StatTileProps = {
  label: string;
  value: React.ReactNode;
  /** Unit rendered after the value (e.g. "ms"). */
  unit?: string;
  hint?: React.ReactNode;
  /** Status always renders an icon AND a word, never colour alone. */
  status?: StatTileStatus;
  /** Override the status word (e.g. "Degraded"). */
  statusLabel?: string;
  loading?: boolean;
  className?: string;
};

/** Headline number with a label, optional hint and a redundant (icon + text) status. */
export function StatTile({
  label,
  value,
  unit,
  hint,
  status = "neutral",
  statusLabel,
  loading,
  className,
}: StatTileProps) {
  const Icon =
    status === "ok" ? CheckCircle2 : status === "warn" ? AlertTriangle : OctagonAlert;
  return (
    <div
      data-slot="stat-tile"
      data-status={status}
      role="group"
      aria-label={label}
      className={cn(
        "flex min-w-0 flex-col gap-1 rounded-lg border border-border bg-card p-4 text-card-foreground",
        className,
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {loading ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <p className="truncate font-display text-2xl font-semibold tabular-nums">
          {value}
          {unit ? (
            <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>
          ) : null}
        </p>
      )}
      {!loading && status !== "neutral" ? (
        <p
          className={cn(
            "inline-flex items-center gap-1 text-xs font-medium",
            status === "ok" && "text-success",
            status === "warn" && "text-warning-foreground dark:text-warning",
            status === "bad" && "text-destructive",
          )}
        >
          <Icon className="size-3.5" aria-hidden />
          {statusLabel ?? STATUS_TEXT[status]}
        </p>
      ) : null}
      {!loading && hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
