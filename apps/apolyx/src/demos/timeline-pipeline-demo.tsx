"use client";

import { Check, Circle } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  Badge,
  Spinner,
  Timeline,
  TimelineContent,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@altr/apolyx";

type Status = "done" | "running" | "queued";

const steps: { step: number; title: string; status: Status; duration: string; owner: string; body: string }[] = [
  { step: 1, title: "Checkout", status: "done", duration: "12s", owner: "AJ", body: "Fetched the latest changes from main." },
  { step: 2, title: "Install dependencies", status: "done", duration: "1m 45s", owner: "SC", body: "Packages installed and cached." },
  { step: 3, title: "Tests", status: "running", duration: "Running", owner: "MR", body: "142 suites across the workspace…" },
  { step: 4, title: "Production build", status: "queued", duration: "Queued", owner: "EW", body: "Optimise assets and prerender pages." },
];

const badgeVariant = { done: "success", running: "info", queued: "secondary" } as const;

function StatusIcon({ status }: { status: Status }) {
  if (status === "done") return <Check strokeWidth={3} />;
  if (status === "running") return <Spinner label="Running" className="[&_svg]:text-current" />;
  return <Circle />;
}

export default function TimelinePipelineDemo() {
  return (
    <Timeline size="lg" defaultValue={3} aria-label="Build pipeline" className="w-full max-w-lg">
      {steps.map((s) => (
        <TimelineItem key={s.step} step={s.step}>
          <TimelineSeparator />
          <TimelineIndicator>
            <StatusIcon status={s.status} />
          </TimelineIndicator>
          <TimelineHeader className="flex-row items-center gap-2">
            <TimelineTitle>{s.title}</TimelineTitle>
            <Badge variant={badgeVariant[s.status]} className="px-1.5 py-0 text-[11px]">
              {s.duration}
            </Badge>
          </TimelineHeader>
          <TimelineContent className="mt-2 flex items-start gap-3 rounded-[var(--radius)] border border-border bg-card p-3 text-card-foreground">
            <Avatar className="size-6 shrink-0 text-[10px]">
              <AvatarFallback>{s.owner}</AvatarFallback>
            </Avatar>
            <p className="text-sm text-muted-foreground">{s.body}</p>
          </TimelineContent>
        </TimelineItem>
      ))}
    </Timeline>
  );
}
