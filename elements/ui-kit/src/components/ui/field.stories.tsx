import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { Field, FieldInput, FieldTextarea, type FieldLayout } from "./field";

const meta = {
  title: "UI/Field",
  component: Field,
  tags: ["autodocs"],
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

const layouts: FieldLayout[] = ["top", "floating", "inline"];

export const Layouts: Story = {
  args: { label: "Email", children: null },
  render: () => (
    <div className="grid w-[22rem] gap-8">
      {layouts.map((layout) => (
        <div key={layout} className="grid gap-4">
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            layout="{layout}"
          </p>
          <Field label="Email" layout={layout} description="We never share it.">
            <FieldInput type="email" placeholder="you@apolyx.dev" />
          </Field>
          <Field label="Display name" layout={layout} required>
            <FieldInput defaultValue="Ada Lovelace" />
          </Field>
        </div>
      ))}
    </div>
  ),
};

export const Floating: Story = {
  args: { label: "Email", children: null },
  render: () => {
    const [value, setValue] = React.useState("");
    return (
      <div className="grid w-80 gap-5">
        <Field label="Email address" layout="floating">
          <FieldInput
            type="email"
            placeholder="you@apolyx.dev"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </Field>
        <Field label="About you" layout="floating" description="Markdown supported.">
          <FieldTextarea placeholder="A few words…" />
        </Field>
      </div>
    );
  },
};

export const Inline: Story = {
  args: { label: "Email", children: null },
  render: () => (
    <div className="grid w-[26rem] gap-3">
      <Field label="Host" layout="inline" labelWidth="6rem">
        <FieldInput placeholder="api.apolyx.dev" />
      </Field>
      <Field label="Port" layout="inline" labelWidth="6rem">
        <FieldInput inputMode="numeric" defaultValue="443" />
      </Field>
      <Field label="Notes" layout="inline" labelWidth="6rem">
        <FieldTextarea placeholder="Optional" />
      </Field>
    </div>
  ),
};

export const States: Story = {
  args: { label: "Email", children: null },
  render: () => (
    <div className="grid w-80 gap-5">
      <Field label="Username" layout="floating" error="That handle is taken.">
        <FieldInput defaultValue="apollo" />
      </Field>
      <Field label="Username" layout="top" error="That handle is taken.">
        <FieldInput defaultValue="apollo" />
      </Field>
      <Field label="Locked" layout="inline" disabled>
        <FieldInput defaultValue="read-only value" />
      </Field>
    </div>
  ),
};
