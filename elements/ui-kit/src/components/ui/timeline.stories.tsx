import type { Meta, StoryObj } from "@storybook/react-vite";
import { Check, GitBranch, GitMerge, GitPullRequest, X } from "lucide-react";

import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "./timeline";

const meta = {
  title: "UI/Timeline",
  component: Timeline,
  tags: ["autodocs"],
  argTypes: {
    value: { control: { type: "number", min: 0, max: 4 } },
    orientation: { control: "inline-radio", options: ["vertical", "horizontal"] },
    layout: { control: "inline-radio", options: ["stacked", "split", "alternate"] },
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    tone: {
      control: "select",
      options: ["primary", "success", "warning", "info", "destructive", "muted"],
    },
  },
} satisfies Meta<typeof Timeline>;

export default meta;
type Story = StoryObj<typeof meta>;

const releases = [
  { step: 1, date: "Mar 2026", title: "Project initialised", body: "Repository, CI, and the token pipeline are in place." },
  { step: 2, date: "Apr 2026", title: "Beta release", body: "Early testers get the kit through the CLI." },
  { step: 3, date: "Jun 2026", title: "Public launch", body: "Docs site and registry go live." },
  { step: 4, date: "Sep 2026", title: "Charts wave", body: "Line and bar charts on visx scales." },
];

export const Playground: Story = {
  args: { value: 2 },
  render: (args) => (
    <Timeline {...args} aria-label="Releases" className="w-[520px]">
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
  ),
};

export const SplitDates: Story = {
  ...Playground,
  args: { value: 2, layout: "split" },
};

export const Alternate: Story = {
  ...Playground,
  args: { value: 3, layout: "alternate" },
};

export const Horizontal: Story = {
  ...Playground,
  args: { value: 2, orientation: "horizontal" },
};

export const WithIcons: Story = {
  args: { value: 3, size: "lg" },
  render: (args) => {
    const events = [
      { step: 1, icon: <GitBranch />, title: "Branch created", date: "15 min ago" },
      { step: 2, icon: <GitPullRequest />, title: "Pull request opened", date: "10 min ago" },
      { step: 3, icon: <GitMerge />, title: "Merged into main", date: "Just now" },
    ];
    return (
      <Timeline {...args} aria-label="Git activity" className="w-[420px]">
        {events.map((e) => (
          <TimelineItem key={e.step} step={e.step}>
            <TimelineSeparator />
            <TimelineIndicator>{e.icon}</TimelineIndicator>
            <TimelineTitle>{e.title}</TimelineTitle>
            <TimelineDate>{e.date}</TimelineDate>
          </TimelineItem>
        ))}
      </Timeline>
    );
  },
};

export const StatusTones: Story = {
  args: { value: 3, size: "lg" },
  render: (args) => (
    <Timeline {...args} aria-label="Deployments" className="w-[420px]">
      {[
        { step: 1, ok: true, title: "Production deploy" },
        { step: 2, ok: false, title: "Preview deploy" },
        { step: 3, ok: true, title: "Staging deploy" },
      ].map((d) => (
        <TimelineItem key={d.step} step={d.step} tone={d.ok ? "success" : "destructive"}>
          <TimelineSeparator />
          <TimelineIndicator>{d.ok ? <Check /> : <X />}</TimelineIndicator>
          <TimelineTitle>{d.title}</TimelineTitle>
          <TimelineContent>{d.ok ? "Ready in 42s" : "Build failed after 1m 12s"}</TimelineContent>
        </TimelineItem>
      ))}
    </Timeline>
  ),
};
