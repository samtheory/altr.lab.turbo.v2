import type { Meta, StoryObj } from "@storybook/react-vite";

import { Label } from "./label";
import { Switch } from "./switch";

const meta = {
  title: "UI/Switch",
  component: Switch,
  tags: ["autodocs"],
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Switch id="s1" />
      <Label htmlFor="s1">Airplane mode</Label>
    </div>
  ),
};

export const Physics: Story = {
  name: "Physics (drag, stretch, bounce)",
  render: () => (
    <div className="grid gap-4">
      <p className="max-w-xs text-sm text-muted-foreground">
        Press and hold to see the thumb stretch toward its target. Drag it and
        push past the end of the rail — it squashes against the wall, then
        bounces back to size on release.
      </p>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Switch id="p-sm" size="sm" />
          <Label htmlFor="p-sm">Small</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="p-md" defaultChecked />
          <Label htmlFor="p-md">Medium</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="p-dis" disabled />
          <Label htmlFor="p-dis">Disabled</Label>
        </div>
      </div>
    </div>
  ),
};
