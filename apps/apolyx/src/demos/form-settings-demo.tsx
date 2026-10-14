"use client";

import * as React from "react";
import {
  Button,
  Field,
  FieldInput,
  FieldSet,
  NumberInput,
  SwitchField,
  cn,
  toast,
} from "@altr/apolyx";

import { SubmitButton, idle, useFormAction, wait, type FormState } from "./form-shared";

type Settings = {
  displayName: string;
  timeout: number | null;
  mentions: boolean;
  digest: boolean;
  product: boolean;
};

const initial: Settings = {
  displayName: "Ada Lovelace",
  timeout: 30,
  mentions: true,
  digest: false,
  product: true,
};

export default function FormSettingsDemo() {
  const [saved, setSaved] = React.useState(initial);
  const [values, setValues] = React.useState(initial);
  const dirty = (Object.keys(values) as (keyof Settings)[]).some((k) => values[k] !== saved[k]);
  const set = <K extends keyof Settings>(key: K) => (v: Settings[K]) => setValues((s) => ({ ...s, [key]: v }));
  const { pending, onSubmit } = useFormAction(async (): Promise<FormState> => {
    await wait(700);
    setSaved(values);
    toast.success("Settings saved");
    return idle;
  }, idle);

  return (
    <form onSubmit={onSubmit} className="relative grid w-full max-w-2xl gap-8">
      <FieldSet legend="Profile" description="How you appear to teammates.">
        <Field orientation="horizontal" label="Display name" description="Shown on comments and mentions.">
          <FieldInput
            name="displayName"
            value={values.displayName}
            onChange={(e) => set("displayName")(e.target.value)}
          />
        </Field>
        <Field orientation="horizontal" label="Session timeout" description="Minutes of inactivity before sign-out.">
          <NumberInput
            name="timeout"
            min={5}
            max={240}
            step={5}
            value={values.timeout}
            onValueChange={set("timeout")}
            className="max-w-36"
          />
        </Field>
      </FieldSet>

      <FieldSet legend="Notifications" description="Email only; in-app alerts are always on." variant="framed">
        <SwitchField
          name="mentions"
          label="Mentions"
          description="When someone @mentions you."
          checked={values.mentions}
          onCheckedChange={set("mentions")}
        />
        <SwitchField
          name="digest"
          label="Weekly digest"
          description="A Monday summary of activity."
          checked={values.digest}
          onCheckedChange={set("digest")}
        />
        <SwitchField
          name="product"
          label="Product updates"
          description="New features, roughly once a month."
          checked={values.product}
          onCheckedChange={set("product")}
        />
      </FieldSet>

      <div
        aria-hidden={!dirty}
        inert={!dirty}
        className={cn(
          "sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-lg border border-border bg-popover px-4 py-3 text-popover-foreground shadow-lg",
          "transition-[opacity,translate] duration-(--duration-base) ease-(--ease-out) motion-reduce:transition-none",
          dirty ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0",
        )}
      >
        <p className="text-sm">You have unsaved changes.</p>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setValues(saved)}>
            Discard
          </Button>
          <SubmitButton pending={pending} size="sm">
            Save
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
