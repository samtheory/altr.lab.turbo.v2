import type { Meta, StoryObj } from "@storybook/react-vite";

import { CountUpCard } from "./count-up-card";

const meta = {
  title: "UI/Count Up Card",
  component: CountUpCard,
  tags: ["autodocs"],
} satisfies Meta<typeof CountUpCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
