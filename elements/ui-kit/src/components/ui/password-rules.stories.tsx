import type { Meta, StoryObj } from "@storybook/react-vite";

import { PasswordRules } from "./password-input";

const meta = {
  title: "UI/PasswordRules",
  component: PasswordRules,
  tags: ["autodocs"],
} satisfies Meta<typeof PasswordRules>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "Choose a password",
    placeholder: "Create a password",
  },
};
