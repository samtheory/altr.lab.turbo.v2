import type { Meta, StoryObj } from "@storybook/react-vite";

import { Checkbox } from "./checkbox";
import { Label } from "./label";

const meta = {
  title: "UI/Checkbox",
  component: Checkbox,
  tags: ["autodocs"],
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Checkbox id="c1" />
      <Label htmlFor="c1">Subscribe</Label>
    </div>
  ),
};

export const Indeterminate: Story = {
  args: { checked: "indeterminate", "aria-label": "Partial" },
};
