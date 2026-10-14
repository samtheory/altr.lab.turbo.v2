import type { Meta, StoryObj } from "@storybook/react-vite";

import { Field } from "./field";
import { NumberInput } from "./number-input";

const meta = {
  title: "UI/NumberInput",
  component: NumberInput,
  tags: ["autodocs"],
} satisfies Meta<typeof NumberInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Split: Story = {
  args: { "aria-label": "Quantity", defaultValue: 1, min: 0, max: 10 },
};

export const Layouts: Story = {
  render: () => (
    <div className="grid w-64 gap-3">
      <NumberInput aria-label="Split" defaultValue={2} />
      <NumberInput aria-label="Stacked" layout="stacked" defaultValue={2} />
      <NumberInput aria-label="None" layout="none" defaultValue={2} />
    </div>
  ),
};

export const Formatting: Story = {
  render: () => (
    <div className="grid w-64 gap-3">
      <Field label="Price">
        <NumberInput defaultValue={1200.5} locale="en-US" format={{ style: "currency", currency: "USD" }} />
      </Field>
      <Field label="Rate">
        <NumberInput defaultValue={0.15} step={0.01} format={{ style: "percent" }} />
      </Field>
      <Field label="Preis">
        <NumberInput defaultValue={1234.5} locale="de-DE" format={{ style: "currency", currency: "EUR" }} />
      </Field>
    </div>
  ),
};
