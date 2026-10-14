"use client";

import { Field, FieldInput, FieldSet, FieldTextarea, toast } from "@altr/apolyx";

import { SubmitButton, idle, useFormAction, wait, type FormState } from "./form-shared";

export default function FormHorizontalDemo() {
  const { pending, onSubmit } = useFormAction(async (): Promise<FormState> => {
    await wait(600);
    toast.success("Workspace updated");
    return idle;
  }, idle);

  return (
    <form onSubmit={onSubmit} className="grid w-full max-w-2xl gap-8">
      <FieldSet legend="Workspace" description="Shown to everyone you invite.">
        <Field orientation="horizontal" label="Name" description="Up to 32 characters.">
          <FieldInput name="workspace" maxLength={32} defaultValue="Apolyx Labs" />
        </Field>
        <Field orientation="horizontal" label="URL" description="Changing it breaks old links.">
          <FieldInput name="slug" defaultValue="apolyx-labs" />
        </Field>
      </FieldSet>
      <FieldSet legend="Billing contact" description="Receipts and plan changes go here.">
        <Field orientation="horizontal" label="Email">
          <FieldInput name="billing" type="email" defaultValue="billing@apolyx.dev" />
        </Field>
        <Field orientation="horizontal" label="Address" optional>
          <FieldTextarea name="address" rows={2} />
        </Field>
      </FieldSet>
      <div className="flex justify-end border-t border-border pt-4">
        <SubmitButton pending={pending}>Save changes</SubmitButton>
      </div>
    </form>
  );
}
