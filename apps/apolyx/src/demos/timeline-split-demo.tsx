"use client";

import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@altr/apolyx";

const roadmap = [
  { step: 1, date: "Jan 2026", title: "AI engine", body: "Context-aware suggestions wired into the editor." },
  { step: 2, date: "Feb 2026", title: "Collaborative editing", body: "Shared cursors and instant sync across workspaces." },
  { step: 3, date: "Mar 2026", title: "Theme builder", body: "Generate token files for new theme families." },
  { step: 4, date: "Apr 2026", title: "Enterprise security", body: "Role-based access and audit trails." },
];

export default function TimelineSplitDemo() {
  return (
    <Timeline layout="split" defaultValue={2} aria-label="Roadmap" className="w-full max-w-lg">
      {roadmap.map((r) => (
        <TimelineItem key={r.step} step={r.step}>
          <TimelineSeparator />
          <TimelineIndicator />
          <TimelineDate>{r.date}</TimelineDate>
          <TimelineTitle>{r.title}</TimelineTitle>
          <TimelineContent>{r.body}</TimelineContent>
        </TimelineItem>
      ))}
    </Timeline>
  );
}
