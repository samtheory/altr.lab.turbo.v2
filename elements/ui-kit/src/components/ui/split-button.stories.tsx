import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "./dropdown-menu";
import { SplitButton, SplitButtonAction, SplitButtonMenu } from "./split-button";

const meta = {
  title: "UI/SplitButton",
  component: SplitButton,
  tags: ["autodocs"],
} satisfies Meta<typeof SplitButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: null },
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <SplitButton>
        <SplitButtonAction>Save</SplitButtonAction>
        <SplitButtonMenu>
          <DropdownMenuItem>Save as draft</DropdownMenuItem>
          <DropdownMenuItem>Save and publish</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Discard changes</DropdownMenuItem>
        </SplitButtonMenu>
      </SplitButton>
      <SplitButton variant="default">
        <SplitButtonAction>Deploy</SplitButtonAction>
        <SplitButtonMenu>
          <DropdownMenuItem>Deploy to production</DropdownMenuItem>
          <DropdownMenuItem>View logs</DropdownMenuItem>
        </SplitButtonMenu>
      </SplitButton>
    </div>
  ),
};
