import type { Meta, StoryObj } from "@storybook/react-vite";

import { SoundRing } from "./sound-ring";

const meta = {
  title: "UI/Sound Ring",
  component: SoundRing,
  tags: ["autodocs"],
} satisfies Meta<typeof SoundRing>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
