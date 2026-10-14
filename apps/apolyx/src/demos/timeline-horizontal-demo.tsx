"use client";

import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@altr/apolyx";

const cycle = [
  { step: 1, date: "Week 1", title: "Planning", body: "Scope and resourcing." },
  { step: 2, date: "Week 2", title: "Design", body: "Flows and prototypes." },
  { step: 3, date: "Week 4", title: "Build", body: "Core implementation." },
  { step: 4, date: "Week 6", title: "Release", body: "Ship and monitor." },
];

export default function TimelineHorizontalDemo() {
  return (
    <div className="w-full max-w-2xl overflow-x-auto">
      <Timeline orientation="horizontal" defaultValue={2} aria-label="Release cycle" className="min-w-[520px]">
        {cycle.map((c) => (
          <TimelineItem key={c.step} step={c.step}>
            <TimelineSeparator />
            <TimelineIndicator />
            <TimelineHeader>
              <TimelineDate>{c.date}</TimelineDate>
              <TimelineTitle>{c.title}</TimelineTitle>
            </TimelineHeader>
            <TimelineContent>{c.body}</TimelineContent>
          </TimelineItem>
        ))}
      </Timeline>
    </div>
  );
}
