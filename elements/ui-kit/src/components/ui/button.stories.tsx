import type { Meta, StoryObj } from "@storybook/react-vite";

import { themeFamilies } from "../../theme";
import { Button, buttonShines, buttonTones } from "./button";
import { StatusButton } from "./status-button";

const meta = {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: [
        "default",
        "destructive",
        "outline",
        "secondary",
        "ghost",
        "link",
        "shiny",
        "status",
        "status-inset",
      ],
    },
    size: {
      control: "select",
      options: ["default", "sm", "md", "lg", "icon"],
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Button",
  },
};

export const Secondary: Story = {
  args: {
    variant: "secondary",
    children: "Secondary",
  },
};

export const Outline: Story = {
  args: {
    variant: "outline",
    children: "Outline",
  },
};

export const Destructive: Story = {
  args: {
    variant: "destructive",
    children: "Destructive",
  },
};

export const Small: Story = {
  args: {
    size: "sm",
    children: "Small",
  },
};

export const Large: Story = {
  args: {
    size: "lg",
    children: "Large",
  },
};

const variants = [
  "default",
  "secondary",
  "outline",
  "ghost",
  "destructive",
  "link",
] as const;

export const HoverContrastDark: Story = {
  name: "Hover contrast (dark, all families)",
  args: { children: "Button" },
  render: () => (
    <div className="grid gap-3">
      {themeFamilies.map((family) => (
        <div
          key={family}
          data-theme={family}
          className="dark flex flex-wrap items-center gap-3 rounded-lg bg-background p-4 text-foreground"
        >
          <span className="w-24 font-mono text-xs text-muted-foreground">
            {family}
          </span>
          {variants.map((variant) => (
            <Button key={variant} variant={variant}>
              {variant}
            </Button>
          ))}
          <Button variant="shiny">Shiny</Button>
        </div>
      ))}
    </div>
  ),
};

export const Shiny: Story = {
  args: { children: "Continue", variant: "shiny", shine: "rainbow" },
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      {buttonShines.map((shine) => (
        <Button key={shine} variant="shiny" shine={shine}>
          {shine}
        </Button>
      ))}
      <Button variant="shiny" disabled>
        Disabled
      </Button>
    </div>
  ),
};

function StatusSet({ variant }: { variant: "status" | "status-inset" }) {
  return (
    <div className="flex flex-wrap gap-2">
      {buttonTones.map((tone) => (
        <StatusButton key={tone} tone={tone} variant={variant} />
      ))}
    </div>
  );
}

export const Status: Story = {
  args: { children: "Pending", variant: "status", tone: "pending" },
  render: () => (
    <div className="grid gap-4">
      <div className="dark rounded-xl bg-background p-4 text-foreground">
        <StatusSet variant="status" />
      </div>
      <StatusSet variant="status" />
    </div>
  ),
};

export const StatusInset: Story = {
  name: "Status inset",
  args: { children: "Pending", variant: "status-inset", tone: "pending" },
  render: () => (
    <div className="grid gap-4">
      <div className="dark rounded-xl bg-background p-4 text-foreground">
        <StatusSet variant="status-inset" />
      </div>
      <StatusSet variant="status-inset" />
    </div>
  ),
};
