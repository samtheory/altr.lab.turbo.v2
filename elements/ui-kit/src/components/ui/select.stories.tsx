import type { Meta, StoryObj } from "@storybook/react";

import { Field } from "./field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./select";

const meta = {
  title: "Components/Select",
  component: Select,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Select defaultValue="apple">
      <SelectTrigger className="w-56" aria-label="Fruit">
        <SelectValue placeholder="Pick a fruit" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="apple">Apple</SelectItem>
        <SelectItem value="banana">Banana</SelectItem>
        <SelectItem value="cherry">Cherry</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex w-64 flex-col gap-3">
      {(["sm", "md", "lg"] as const).map((size) => (
        <Select key={size} size={size} defaultValue="md">
          <SelectTrigger aria-label={`Size ${size}`}>
            <SelectValue placeholder={size} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sm">Small</SelectItem>
            <SelectItem value="md">Medium</SelectItem>
            <SelectItem value="lg">Large</SelectItem>
          </SelectContent>
        </Select>
      ))}
    </div>
  ),
};

export const Groups: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-64" aria-label="Timezone">
        <SelectValue placeholder="Timezone" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>North America</SelectLabel>
          <SelectItem value="pst">Pacific Time</SelectItem>
          <SelectItem value="est">Eastern Time</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Europe</SelectLabel>
          <SelectItem value="gmt">GMT</SelectItem>
          <SelectItem value="cet" disabled>
            CET (offline)
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
};

export const WithField: Story = {
  render: () => (
    <Field label="Bucket" className="w-64" description="Jord records namespace.">
      <Select defaultValue="lab">
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="lab">lab</SelectItem>
          <SelectItem value="artemis">artemis</SelectItem>
          <SelectItem value="jord">jord</SelectItem>
        </SelectContent>
      </Select>
    </Field>
  ),
};
