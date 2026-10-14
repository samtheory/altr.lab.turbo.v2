"use client";

import * as React from "react";
import { Field, FieldInput, MaskedInput, masks, toast } from "@altr/apolyx";

import {
  EMAIL,
  ErrorSummary,
  SubmitButton,
  formValues,
  idle,
  useFocusFirstInvalid,
  useFormAction,
  wait,
  type FormState,
} from "./form-shared";

const labels = { company: "Company", email: "Work email", zip: "ZIP code" };

export default function FormErrorSummaryDemo() {
  const { state, pending, onSubmit } = useFormAction(async (_: FormState, data: FormData): Promise<FormState> => {
    await wait(500);
    const v = formValues(data);
    const errors: FormState["errors"] = {};
    if (!v.company?.trim()) errors.company = "Enter your company name.";
    if (!EMAIL.test(v.email ?? "")) errors.email = "Enter a work email like you@company.com.";
    if (!/^\d{5}(\d{4})?$/.test(v.zip ?? "")) errors.zip = "Enter a 5 or 9 digit ZIP code.";
    if (Object.keys(errors).length) return { status: "error", errors };
    toast.success("Request sent");
    return idle;
  }, idle);
  const formRef = React.useRef<HTMLFormElement>(null);
  useFocusFirstInvalid(formRef, state);
  const e = state.errors;

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="grid w-full max-w-sm gap-5">
      <ErrorSummary errors={e} labels={labels} idPrefix="summary" />
      <Field id="summary-company" label={labels.company} error={e.company}>
        <FieldInput name="company" autoComplete="organization" />
      </Field>
      <Field id="summary-email" label={labels.email} error={e.email}>
        <FieldInput name="email" type="email" autoComplete="email" />
      </Field>
      <Field id="summary-zip" label={labels.zip} error={e.zip}>
        <MaskedInput name="zip" mask={masks.zipUS} autoComplete="postal-code" />
      </Field>
      <SubmitButton pending={pending}>Request a demo</SubmitButton>
    </form>
  );
}
