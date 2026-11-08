import type { Meta, StoryObj } from "@storybook/react-vite";
import { Github, Star } from "lucide-react";

import {
  ButtonGroup,
  ButtonGroupAddon,
  ButtonGroupItem,
  ButtonGroupSeparator,
} from "./button-group";

const meta = {
  title: "UI/ButtonGroup",
  component: ButtonGroup,
  tags: ["autodocs"],
} satisfies Meta<typeof ButtonGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithSeparator: Story = {
  args: { children: null },
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <ButtonGroup>
        <ButtonGroupItem>
          <Star aria-hidden />
          Star
        </ButtonGroupItem>
        <ButtonGroupSeparator />
        <ButtonGroupAddon>
          <Github aria-hidden />
          15K
        </ButtonGroupAddon>
      </ButtonGroup>
      <ButtonGroup variant="default">
        <ButtonGroupItem>Publish</ButtonGroupItem>
        <ButtonGroupSeparator />
        <ButtonGroupAddon>Live</ButtonGroupAddon>
      </ButtonGroup>
    </div>
  ),
};

export const Flush: Story = {
  args: { children: null },
  render: () => (
    <ButtonGroup>
      <ButtonGroupItem>Day</ButtonGroupItem>
      <ButtonGroupItem>Week</ButtonGroupItem>
      <ButtonGroupItem>Month</ButtonGroupItem>
    </ButtonGroup>
  ),
};
