import type { Meta, StoryObj } from "@storybook/react-vite";

import { AvatarStatus } from "./avatar-status";

const meta = {
  title: "UI/AvatarStatus",
  component: AvatarStatus,
  tags: ["autodocs"],
} satisfies Meta<typeof AvatarStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Online: Story = {
  args: {
    status: "online",
    fallback: "ON",
  },
};
