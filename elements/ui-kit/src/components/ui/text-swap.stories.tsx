import type { Meta, StoryObj } from "@storybook/react-vite";

import { TextSwap } from "./text-swap";

const meta = {
  title: "UI/Text Swap",
  component: TextSwap,
  tags: ["autodocs"],
} satisfies Meta<typeof TextSwap>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    beforeText: "Good ideas start small.",
    afterText: "Great products ship.",
  },
};
