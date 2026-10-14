"use client";

import * as React from "react";
import { Field, FieldCounter, FieldInput, FieldTextarea, toast } from "@altr/apolyx";

import {
  SubmitButton,
  formValues,
  idle,
  useFocusFirstInvalid,
  useFormAction,
  wait,
  type FormState,
} from "./form-shared";

export default function FormSuccessDemo() {
  const [formKey, setFormKey] = React.useState(0);
  const { state, pending, onSubmit } = useFormAction(async (_: FormState, data: FormData): Promise<FormState> => {
    await wait(700);
    if (!formValues(data).message?.trim()) {
      return { status: "error", errors: { message: "Write a short message." } };
    }
    toast.success("Feedback sent", { description: "Thanks — we read every note." });
    setFormKey((k) => k + 1);
    return idle;
  }, idle);
  const formRef = React.useRef<HTMLFormElement>(null);
  useFocusFirstInvalid(formRef, state);

  return (
    <form key={formKey} ref={formRef} onSubmit={onSubmit} noValidate className="grid w-full max-w-sm gap-5">
      <Field label="Subject" optional>
        <FieldInput name="subject" />
      </Field>
      <Field label="Message" error={state.errors.message}>
        <FieldTextarea name="message" rows={4} />
        <FieldCounter max={280} />
      </Field>
      <SubmitButton pending={pending} className="justify-self-start">
        Send feedback
      </SubmitButton>
    </form>
  );
}
