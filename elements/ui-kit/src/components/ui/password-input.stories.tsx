import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { Field } from "./field";
import { PasswordInput, PasswordStrength } from "./password-input";

const meta = {
  title: "UI/PasswordInput",
  component: PasswordInput,
  tags: ["autodocs"],
} satisfies Meta<typeof PasswordInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { "aria-label": "Password", placeholder: "Password" },
};

export const InField: Story = {
  render: () => (
    <Field label="Password" labelAside={<a href="#reset">Forgot?</a>} className="w-80">
      <PasswordInput />
    </Field>
  ),
};

export const Strength: Story = {
  render: () => {
    const [value, setValue] = React.useState("Apolyx1");
    return (
      <div className="grid w-80 gap-3">
        <Field label="New password">
          <PasswordInput value={value} onChange={(e) => setValue(e.target.value)} autoComplete="new-password" />
        </Field>
        <PasswordStrength value={value} variant="both" />
      </div>
    );
  },
};
