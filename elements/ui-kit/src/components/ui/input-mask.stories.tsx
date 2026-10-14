import type { Meta, StoryObj } from "@storybook/react-vite";

import { masks } from "../../lib/mask";
import { MaskedInput } from "./input-mask";

const meta = {
  title: "UI/MaskedInput",
  component: MaskedInput,
  tags: ["autodocs"],
  args: { className: "max-w-xs" },
} satisfies Meta<typeof MaskedInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Phone: Story = {
  args: { mask: masks.phoneUS, "aria-label": "Phone" },
};

export const Card: Story = {
  args: { mask: masks.card, "aria-label": "Card number", defaultValue: "4242424242424242" },
};

export const Guide: Story = {
  args: { mask: masks.date, "aria-label": "Date", showGuide: true, defaultValue: "0102" },
};

export const CustomTokens: Story = {
  args: { mask: "\\#HHHHHH", tokens: { H: /[0-9a-fA-F]/ }, "aria-label": "Hex color" },
};
