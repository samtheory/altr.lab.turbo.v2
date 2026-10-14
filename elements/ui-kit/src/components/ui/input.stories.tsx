import type { Meta, StoryObj } from "@storybook/react-vite";

import { Input } from "./input";
import { Label } from "./label";

const meta = {
  title: "UI/Input",
  component: Input,
  tags: ["autodocs"],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { placeholder: "Email" },
};

export const WithLabel: Story = {
  render: () => (
    <div className="flex w-64 flex-col gap-2">
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" placeholder="you@altr.lab" />
    </div>
  ),
};

export const Invalid: Story = {
  args: { "aria-invalid": true, defaultValue: "bad" },
};

const variants = ["outline", "filled", "underline", "ghost"] as const;
const sizes = ["sm", "md", "lg"] as const;

export const VariantMatrix: Story = {
  render: () => (
    <div className="grid w-[40rem] grid-cols-3 gap-3">
      {variants.flatMap((variant) =>
        sizes.map((size) => (
          <Input
            key={`${variant}-${size}`}
            variant={variant}
            size={size}
            placeholder={`${variant} · ${size}`}
            aria-label={`${variant} ${size}`}
          />
        )),
      )}
      <Input shape="pill" placeholder="pill" aria-label="pill" className="col-span-3" />
    </div>
  ),
};

const nativeTypes = ["password", "email", "number", "date", "time", "file", "color", "range", "search"] as const;

export const NativeTypes: Story = {
  render: () => (
    <div className="grid w-[36rem] grid-cols-2 gap-4">
      {nativeTypes.map((type) => (
        <div key={type} className="grid gap-1.5">
          <Label htmlFor={`story-${type}`} className="font-mono text-xs">
            {type}
          </Label>
          <Input id={`story-${type}`} type={type} />
        </div>
      ))}
    </div>
  ),
};
