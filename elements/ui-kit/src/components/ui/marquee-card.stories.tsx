import type { Meta, StoryObj } from "@storybook/react-vite";

import { MarqueeCard } from "./marquee-card";

const meta = {
  title: "UI/Marquee Card",
  component: MarqueeCard,
  tags: ["autodocs"],
} satisfies Meta<typeof MarqueeCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
