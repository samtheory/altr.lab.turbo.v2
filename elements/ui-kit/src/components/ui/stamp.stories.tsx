import type { Meta, StoryObj } from "@storybook/react-vite";

import { Stamp } from "./stamp";

const meta = {
  title: "UI/Stamp",
  component: Stamp,
  tags: ["autodocs"],
  argTypes: {
    shape: { control: "radio", options: ["circle", "square"] },
    variant: {
      control: "select",
      options: ["sale", "success", "warning", "muted", "outline"],
    },
  },
} satisfies Meta<typeof Stamp>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Circle: Story = {
  args: {
    children: "Sale",
    shape: "circle",
    orbit: "Save now on sale",
    duration: 28,
  },
};

export const Square: Story = {
  args: {
    children: "New",
    shape: "square",
    variant: "success",
    orbit: "Just dropped · limited",
    rotate: 6,
  },
};

export const NoOrbit: Story = {
  args: {
    children: "Sold",
    orbit: false,
    ring: true,
    variant: "outline",
  },
};
