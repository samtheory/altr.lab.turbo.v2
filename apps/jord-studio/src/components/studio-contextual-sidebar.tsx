"use client";

import { Button, Skeleton, cn } from "@altr/apolyx";

import { StudioSidebar, useStudioPanes } from "@/components/studio-panes";
import {
  CONTEXTUAL_LABELS,
  type StudioContextual,
} from "@/lib/studio-nav";

const PLACEHOLDER_BLURB: Record<StudioContextual, string> = {
  tables: "Schema picker, search, and table list arrive in S0047 / S0050.",
  jobs: "Job list with status filters arrives in S0047.",
  endpoints: "Endpoint list grouped by table/custom arrives in S0047.",
  queries: "Saved queries and history arrive in S0047 / S0064.",
  users: "User list with search arrives in S0047 / S0070.",
  buckets: "Bucket list arrives in S0047 / S0068.",
};

type Props = {
  contextual: StudioContextual;
  className?: string;
};

export function StudioContextualSidebar({ contextual, className }: Props) {
  const { sidebarStatus, sidebarSlot, setSidebarStatus } = useStudioPanes();
  const label = CONTEXTUAL_LABELS[contextual];

  return (
    <StudioSidebar className={className}>
      <div className="flex h-full min-h-[12rem] flex-col gap-3 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          {sidebarStatus === "error" ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setSidebarStatus("ready")}
            >
              Retry
            </Button>
          ) : null}
        </div>

        {sidebarSlot ? (
          sidebarSlot
        ) : sidebarStatus === "loading" ? (
          <SidebarLoading />
        ) : sidebarStatus === "empty" ? (
          <SidebarEmpty label={label} />
        ) : sidebarStatus === "error" ? (
          <SidebarError label={label} />
        ) : (
          <SidebarPlaceholder contextual={contextual} />
        )}
      </div>
    </StudioSidebar>
  );
}

function SidebarPlaceholder({
  contextual,
}: {
  contextual: StudioContextual;
}) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col justify-center rounded-md border border-dashed border-border bg-muted/30 px-3 py-6 text-center",
      )}
    >
      <p className="text-sm font-medium text-foreground">
        {CONTEXTUAL_LABELS[contextual]} sidebar
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {PLACEHOLDER_BLURB[contextual]}
      </p>
    </div>
  );
}

function SidebarLoading() {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-8 w-full" />
    </div>
  );
}

function SidebarEmpty({ label }: { label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-md border border-dashed border-border px-3 py-6 text-center">
      <p className="text-sm text-muted-foreground">No {label.toLowerCase()} yet</p>
    </div>
  );
}

function SidebarError({ label }: { label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-md border border-destructive/40 bg-destructive/5 px-3 py-6 text-center">
      <p className="text-sm text-destructive">Could not load {label.toLowerCase()}</p>
    </div>
  );
}
