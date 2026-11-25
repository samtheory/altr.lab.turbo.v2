import type { Meta, StoryObj } from "@storybook/react-vite";

import { EmptyState } from "./empty-state";

const meta = {
  title: "UI/EmptyState",
  component: EmptyState,
  tags: ["autodocs"],
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
