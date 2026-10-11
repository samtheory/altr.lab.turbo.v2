import type { Meta, StoryObj } from "@storybook/react-vite";

import { FadeIn } from "./fade-in";
import { HoverLift } from "./hover-lift";
import { Pressable } from "./pressable";
import { Stagger, StaggerItem } from "./stagger";

function Recipes() {
  return (
    <div className="flex w-[360px] flex-col gap-6 text-left">
      <FadeIn>
        <p className="text-lg font-medium">FadeIn</p>
      </FadeIn>
      <Stagger className="space-y-2">
        {["One", "Two", "Three"].map((label) => (
          <StaggerItem key={label}>
            <div className="rounded-md border border-border bg-card px-3 py-2">
              {label}
            </div>
          </StaggerItem>
        ))}
      </Stagger>
      <Pressable className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground">
        Pressable
      </Pressable>
      <HoverLift className="rounded-md border border-border bg-card p-4">
        HoverLift card
      </HoverLift>
      <p className="text-xs text-muted-foreground">
        OS “reduce motion” should disable translate/scale on these recipes.
      </p>
    </div>
  );
}

const meta = {
  title: "Motion/Recipes",
  component: Recipes,
  tags: ["autodocs"],
} satisfies Meta<typeof Recipes>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
