"use client";

import * as React from "react";
import { Field, FieldInput, FieldTextarea, Grid, MaskedInput, masks, toast } from "@altr/apolyx";

import {
  EMAIL,
  SubmitButton,
  formValues,
  idle,
  useFocusFirstInvalid,
  useFormAction,
  wait,
  type FormState,
} from "./form-shared";

export default function FormTwoColumnDemo() {
  const { state, pending, onSubmit } = useFormAction(async (_: FormState, data: FormData): Promise<FormState> => {
    await wait(600);
    const v = formValues(data);
    const errors: FormState["errors"] = {};
    if (!v.first?.trim()) errors.first = "Enter a first name.";
    if (!EMAIL.test(v.email ?? "")) errors.email = "Enter a valid email.";
    if (Object.keys(errors).length) return { status: "error", errors };
    toast.success("Profile saved");
    return idle;
  }, idle);
  const formRef = React.useRef<HTMLFormElement>(null);
  useFocusFirstInvalid(formRef, state);
  const e = state.errors;

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="grid w-full max-w-xl gap-5">
      <Grid cols={{ base: 1, sm: 2 }} gap="md">
        <Field label="First name" error={e.first}>
          <FieldInput name="first" autoComplete="given-name" defaultValue="Ada" />
        </Field>
        <Field label="Last name" optional>
          <FieldInput name="last" autoComplete="family-name" defaultValue="Lovelace" />
        </Field>
        <Field label="Email" error={e.email}>
          <FieldInput name="email" type="email" autoComplete="email" defaultValue="ada@apolyx.dev" />
        </Field>
        <Field label="Phone" optional>
          <MaskedInput name="phone" mask={masks.phoneUS} autoComplete="tel-national" />
        </Field>
      </Grid>
      <Field label="Bio" description="A sentence or two for your public profile." optional>
        <FieldTextarea name="bio" rows={3} />
      </Field>
      <div className="flex justify-end">
        <SubmitButton pending={pending}>Save profile</SubmitButton>
      </div>
    </form>
  );
}
