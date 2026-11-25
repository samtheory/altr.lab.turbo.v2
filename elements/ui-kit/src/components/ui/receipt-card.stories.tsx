import type { Meta, StoryObj } from "@storybook/react-vite";

import { ReceiptCard } from "./receipt-card";

const meta = {
  title: "UI/Receipt Card",
  component: ReceiptCard,
  tags: ["autodocs"],
} satisfies Meta<typeof ReceiptCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
