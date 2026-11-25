import type { Meta, StoryObj } from "@storybook/react-vite";

import { FlipText } from "./flip-text";

const meta = {
  title: "UI/Flip Text",
  component: FlipText,
  tags: ["autodocs"],
} satisfies Meta<typeof FlipText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: "Small things" },
};
