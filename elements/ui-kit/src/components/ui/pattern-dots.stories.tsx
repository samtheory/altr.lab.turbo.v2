import type { Meta, StoryObj } from "@storybook/react";

import { PatternDots } from "./pattern-dots";

const meta: Meta<typeof PatternDots> = {
  title: "UI/PatternDots",
  component: PatternDots,
};

export default meta;
type Story = StoryObj<typeof PatternDots>;

export const Default: Story = {
  render: () => (
    <PatternDots className="h-40 w-full max-w-md rounded-lg border border-border" />
  ),
};