import type { Meta, StoryObj } from "@storybook/react-vite";

import { FadeIn } from "./motion";

const meta = {
  title: "Motion/FadeIn",
  component: FadeIn,
  tags: ["autodocs"],
} satisfies Meta<typeof FadeIn>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <p className="text-lg font-medium">Fades in with a short rise</p>
    ),
    delay: 0,
    y: 16,
  },
};

export const Delayed: Story = {
  args: {
    children: <p className="text-lg font-medium">Starts after 0.4s</p>,
    delay: 0.4,
    y: 24,
  },
};
