import type { Meta, StoryObj } from "@storybook/react-vite";

import { StoryQuote } from "./story-quote";

const meta = {
  title: "UI/Story Quote",
  component: StoryQuote,
  tags: ["autodocs"],
} satisfies Meta<typeof StoryQuote>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
