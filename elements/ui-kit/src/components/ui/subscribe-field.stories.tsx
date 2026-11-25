import type { Meta, StoryObj } from "@storybook/react-vite";

import { SubscribeField } from "./subscribe-field";

const meta = {
  title: "UI/SubscribeField",
  component: SubscribeField,
  tags: ["autodocs"],
} satisfies Meta<typeof SubscribeField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    simulate: false,
    defaultCount: 128,
  },
};
