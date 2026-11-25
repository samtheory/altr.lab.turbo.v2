import type { Meta, StoryObj } from "@storybook/react";

import { Badge } from "./badge";
import { Marquee } from "./marquee";

const meta: Meta<typeof Marquee> = {
  title: "UI/Marquee",
  component: Marquee,
};

export default meta;
type Story = StoryObj<typeof Marquee>;

export const Tags: Story = {
  render: () => (
    <Marquee pauseOnHover duration={20} className="max-w-md">
      {["Tokens", "Motion", "Charts"].map((t) => (
        <Badge key={t} variant="secondary">
          {t}
        </Badge>
      ))}
    </Marquee>
  ),
};