"use client";

import {
  Timeline,
  TimelineDate,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
  type TimelineTone,
} from "@altr/apolyx";

const phases: { step: number; date: string; verb: string; title: string; tone: TimelineTone }[] = [
  { step: 1, date: "Jul 15", verb: "Started", title: "Project kickoff", tone: "muted" },
  { step: 2, date: "Aug 01", verb: "Completed", title: "Requirements", tone: "info" },
  { step: 3, date: "Oct 15", verb: "Initiated", title: "Design phase", tone: "warning" },
  { step: 4, date: "Nov 01", verb: "Completed", title: "Usability testing", tone: "primary" },
  { step: 5, date: "Dec 15", verb: "Completed", title: "Beta program", tone: "success" },
];

export default function TimelineRoadmapDemo() {
  return (
    <Timeline size="sm" defaultValue={5} aria-label="Roadmap" className="w-full max-w-xs">
      {phases.map((p) => (
        <TimelineItem key={p.step} step={p.step} tone={p.tone} className="pb-4">
          <TimelineSeparator />
          <TimelineIndicator />
          <TimelineDate className="text-[10px] font-semibold uppercase tracking-wider">
            {p.date}
          </TimelineDate>
          <TimelineTitle className="font-medium">
            <span className="text-muted-foreground">{p.verb}</span> {p.title}
          </TimelineTitle>
        </TimelineItem>
      ))}
    </Timeline>
  );
}
