import type { Meta, StoryObj } from "@storybook/react-vite";

import { ConfettiCard } from "./confetti-card";

const meta = {
  title: "UI/Confetti Card",
  component: ConfettiCard,
  tags: ["autodocs"],
} satisfies Meta<typeof ConfettiCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
