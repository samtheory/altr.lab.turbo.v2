import type { Meta, StoryObj } from "@storybook/react-vite";

import { MetricSparkCard } from "./metric-spark-card";

const meta = {
  title: "UI/Metric Spark Card",
  component: MetricSparkCard,
  tags: ["autodocs"],
} satisfies Meta<typeof MetricSparkCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
