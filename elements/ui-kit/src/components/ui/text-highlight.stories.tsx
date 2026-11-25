import type { Meta, StoryObj } from "@storybook/react-vite";

import { TextHighlight } from "./text-highlight";

const meta = {
  title: "UI/Text Highlight",
  component: TextHighlight,
  tags: ["autodocs"],
} satisfies Meta<typeof TextHighlight>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
