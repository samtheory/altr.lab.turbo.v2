import type { Meta, StoryObj } from "@storybook/react-vite";

import { QrBadge } from "./qr-badge";

const meta = {
  title: "UI/QrBadge",
  component: QrBadge,
  tags: ["autodocs"],
} satisfies Meta<typeof QrBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "Scan me",
  },
};
