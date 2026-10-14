"use client";

import {
  Timeline,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@altr/apolyx";

const milestones = [
  { step: 1, date: "Jan 2026", title: "Seed funding" },
  { step: 2, date: "Mar 2026", title: "Product MVP" },
  { step: 3, date: "May 2026", title: "First client" },
  { step: 4, date: "Jul 2026", title: "Series A" },
  { step: 5, date: "Sep 2026", title: "Global expansion" },
];

export default function TimelineAlternateDemo() {
  return (
    <Timeline layout="alternate" defaultValue={3} aria-label="Company milestones" className="w-full max-w-md">
      {milestones.map((m) => (
        <TimelineItem key={m.step} step={m.step}>
          <TimelineSeparator />
          <TimelineIndicator />
          <TimelineHeader>
            <TimelineDate>{m.date}</TimelineDate>
            <TimelineTitle>{m.title}</TimelineTitle>
          </TimelineHeader>
        </TimelineItem>
      ))}
    </Timeline>
  );
}
