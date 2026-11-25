import type { Meta, StoryObj } from "@storybook/react-vite";

import { SwipeDeck } from "./swipe-deck";

const meta = {
  title: "UI/Swipe Deck",
  component: SwipeDeck,
  tags: ["autodocs"],
} satisfies Meta<typeof SwipeDeck>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
