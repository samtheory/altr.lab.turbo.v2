import type { Meta, StoryObj } from "@storybook/react-vite";

import { BarChart } from "./bar-chart";
import { ChartContainer } from "./chart-container";
import { LineChart } from "./line-chart";

const sample = [
  { month: "Jan", a: 12, b: 8 },
  { month: "Feb", a: 18, b: 11 },
  { month: "Mar", a: 15, b: 14 },
  { month: "Apr", a: 22, b: 16 },
];

const config = {
  a: { label: "Series A", color: "chart-1" as const },
  b: { label: "Series B", color: "chart-2" as const },
};

function ChartsDemo() {
  return (
    <div className="flex w-[560px] max-w-full flex-col gap-8">
      <ChartContainer config={config} aria-label="Line demo" className="h-64">
        <LineChart data={sample} x="month" series={["a", "b"]} area />
      </ChartContainer>
      <ChartContainer config={config} aria-label="Bar demo" className="h-64">
        <BarChart data={sample} x="month" series={["a", "b"]} />
      </ChartContainer>
    </div>
  );
}

const meta = {
  title: "Charts/Overview",
  component: ChartsDemo,
  tags: ["autodocs"],
} satisfies Meta<typeof ChartsDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  render: () => (
    <ChartContainer config={config} empty className="h-40" aria-label="Empty" >
      <div />
    </ChartContainer>
  ),
};

export const Loading: Story = {
  render: () => (
    <ChartContainer config={config} loading className="h-40" aria-label="Loading">
      <div />
    </ChartContainer>
  ),
};
