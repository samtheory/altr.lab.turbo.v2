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

const releases = [
  { step: 1, date: "Mar 2026", title: "Project initialised", body: "Repository, CI, and the token pipeline are in place." },
  { step: 2, date: "Apr 2026", title: "Beta release", body: "Early testers install components through the CLI." },
  { step: 3, date: "Jun 2026", title: "Public launch", body: "Docs site and registry go live for everyone." },
];

export default function TimelineDemo() {
  return (
    <Timeline defaultValue={2} aria-label="Release history" className="w-full max-w-md">
      {releases.map((r) => (
        <TimelineItem key={r.step} step={r.step}>
          <TimelineSeparator />
          <TimelineIndicator />
          <TimelineHeader>
            <TimelineDate>{r.date}</TimelineDate>
            <TimelineTitle>{r.title}</TimelineTitle>
          </TimelineHeader>
          <TimelineContent>{r.body}</TimelineContent>
        </TimelineItem>
      ))}
    </Timeline>
  );
}
