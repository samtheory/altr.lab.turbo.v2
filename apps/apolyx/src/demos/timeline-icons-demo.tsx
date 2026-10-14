"use client";

import { GitCompareArrows, GitFork, GitMerge, GitPullRequestArrow } from "lucide-react";
import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@altr/apolyx";

const activity = [
  { step: 1, icon: <GitFork />, title: "Forked repository", body: "Created a branch for the timeline component.", date: "15 minutes ago" },
  { step: 2, icon: <GitPullRequestArrow />, title: "Pull request opened", body: "PR #342 is waiting for review.", date: "10 minutes ago" },
  { step: 3, icon: <GitCompareArrows />, title: "Changes requested", body: "Minor adjustments to error handling.", date: "5 minutes ago" },
  { step: 4, icon: <GitMerge />, title: "Merged", body: "The branch landed on main.", date: "Just now" },
];

export default function TimelineIconsDemo() {
  return (
    <Timeline size="lg" defaultValue={3} aria-label="Repository activity" className="w-full max-w-md">
      {activity.map((a) => (
        <TimelineItem key={a.step} step={a.step}>
          <TimelineSeparator />
          <TimelineIndicator>{a.icon}</TimelineIndicator>
          <TimelineTitle>{a.title}</TimelineTitle>
          <TimelineContent>
            {a.body}
            <TimelineDate className="mt-1">{a.date}</TimelineDate>
          </TimelineContent>
        </TimelineItem>
      ))}
    </Timeline>
  );
}
