import type { Meta, StoryObj } from "@storybook/react-vite";

import { StackCards } from "./stack-cards";

const meta = {
  title: "UI/Stack Cards",
  component: StackCards,
  tags: ["autodocs"],
} satisfies Meta<typeof StackCards>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
