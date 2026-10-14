import type { Meta, StoryObj } from "@storybook/react-vite";

import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "./input-otp";

const meta = {
  title: "UI/InputOTP",
  component: InputOTP,
  tags: ["autodocs"],
} satisfies Meta<typeof InputOTP>;

export default meta;
type Story = StoryObj<typeof meta>;

const six = (
  <>
    <InputOTPGroup>
      <InputOTPSlot index={0} />
      <InputOTPSlot index={1} />
      <InputOTPSlot index={2} />
    </InputOTPGroup>
    <InputOTPSeparator />
    <InputOTPGroup>
      <InputOTPSlot index={3} />
      <InputOTPSlot index={4} />
      <InputOTPSlot index={5} />
    </InputOTPGroup>
  </>
);

export const Default: Story = {
  args: { maxLength: 6, "aria-label": "Code", children: six },
};

export const Invalid: Story = {
  args: { maxLength: 6, "aria-label": "Code", defaultValue: "381904", "aria-invalid": true, children: six },
};

export const Masked: Story = {
  args: { maxLength: 6, "aria-label": "PIN", defaultValue: "1234", mask: true, children: six },
};

export const Alphanumeric: Story = {
  args: { maxLength: 6, "aria-label": "Key", pattern: "alphanumeric", size: "lg", children: six },
};
