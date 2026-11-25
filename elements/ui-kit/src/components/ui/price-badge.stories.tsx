import type { Meta, StoryObj } from "@storybook/react-vite";

import { PriceBadge } from "./price-badge";

const meta = {
  title: "UI/PriceBadge",
  component: PriceBadge,
  tags: ["autodocs"],
} satisfies Meta<typeof PriceBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Rolling: Story = {
  args: {
    values: ["$17.38", "$3.15", "$35.99", "Free"],
    interval: 1800,
  },
};

export const Controlled: Story = {
  args: {
    value: "$29.00",
    variant: "success",
  },
};

export const WithCompareAt: Story = {
  args: {
    currency: "$",
    price: "19",
    compareAt: "$39",
    variant: "outline",
  },
};
