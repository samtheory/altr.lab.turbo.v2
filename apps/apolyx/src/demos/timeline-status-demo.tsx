"use client";

import { Check, X } from "lucide-react";
import {
  Badge,
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@altr/apolyx";

const deploys = [
  { step: 1, title: "Production", date: "3 hours ago", commit: "m0n1o2p", branch: "main", ok: true, duration: "45s" },
  { step: 2, title: "Preview", date: "1 hour ago", commit: "i7j8k9l", branch: "feat/auth", ok: false, duration: "1m 12s" },
  { step: 3, title: "Staging", date: "15 minutes ago", commit: "e4f5g6h", branch: "staging", ok: true, duration: "38s" },
  { step: 4, title: "Production", date: "2 minutes ago", commit: "a1b2c3d", branch: "main", ok: true, duration: "42s" },
];

export default function TimelineStatusDemo() {
  return (
    <Timeline size="lg" value={deploys.length} aria-label="Deployments" className="w-full max-w-sm">
      {deploys.map((d) => (
        <TimelineItem key={d.step} step={d.step} tone={d.ok ? "success" : "destructive"}>
          <TimelineSeparator />
          <TimelineIndicator>{d.ok ? <Check strokeWidth={3} /> : <X strokeWidth={3} />}</TimelineIndicator>
          <TimelineHeader className="flex-row items-center gap-2">
            <TimelineTitle>{d.title} deploy</TimelineTitle>
            <Badge variant={d.ok ? "success" : "destructive"} className="px-1.5 py-0 text-[11px]">
              {d.ok ? "ready" : "failed"}
            </Badge>
          </TimelineHeader>
          <TimelineContent>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-mono">{d.commit}</span>
              <span aria-hidden>·</span>
              <span>{d.branch}</span>
              <span aria-hidden>·</span>
              <span>{d.duration}</span>
            </div>
            <TimelineDate>{d.date}</TimelineDate>
          </TimelineContent>
        </TimelineItem>
      ))}
    </Timeline>
  );
}
