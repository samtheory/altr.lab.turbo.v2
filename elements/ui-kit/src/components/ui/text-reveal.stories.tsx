import type { Meta, StoryObj } from "@storybook/react-vite";

import { TextReveal } from "./text-reveal";

const meta = {
  title: "UI/Text Reveal",
  component: TextReveal,
  tags: ["autodocs"],
} satisfies Meta<typeof TextReveal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { text: "Words that arrive one at a time." },
};
