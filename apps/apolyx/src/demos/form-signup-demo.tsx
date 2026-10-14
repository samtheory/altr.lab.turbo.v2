"use client";

import * as React from "react";
import {
  Checkbox,
  Field,
  FieldInput,
  Label,
  PasswordInput,
  PasswordStrength,
  defaultPasswordRules,
  toast,
} from "@altr/apolyx";

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

function validate(data: FormData) {
  const v = formValues(data);
  const errors: FormState["errors"] = {};
  if (!v.name?.trim()) errors.name = "Enter your name.";
  if (!EMAIL.test(v.email ?? "")) errors.email = "Enter an email like ada@apolyx.dev.";
  const missing = defaultPasswordRules.filter((r) => !r.test(v.password ?? "")).map((r) => r.label);
  if (missing.length) errors.password = missing;
  if (v.terms !== "on") errors.terms = "Accept the terms to continue.";
  return errors;
}

export default function FormSignupDemo() {
  const [password, setPassword] = React.useState("");
  const [formKey, setFormKey] = React.useState(0);
  const { state, pending, onSubmit } = useFormAction(async (_: FormState, data: FormData): Promise<FormState> => {
    await wait(700);
    const errors = validate(data);
    if (Object.keys(errors).length) return { status: "error", errors };
    toast.success(`Welcome, ${String(data.get("name")).split(" ")[0]}`);
    setPassword("");
    setFormKey((k) => k + 1);
    return idle;
  }, idle);
  const formRef = React.useRef<HTMLFormElement>(null);
  useFocusFirstInvalid(formRef, state);
  const e = state.errors;

  return (
    <form key={formKey} ref={formRef} onSubmit={onSubmit} noValidate className="grid w-full max-w-sm gap-5">
      <Field label="Name" error={e.name}>
        <FieldInput name="name" autoComplete="name" />
      </Field>
      <Field label="Email" error={e.email}>
        <FieldInput name="email" type="email" autoComplete="email" />
      </Field>
      <div className="grid gap-2">
        <Field label="Password" error={e.password}>
          <PasswordInput
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
          />
        </Field>
        <PasswordStrength value={password} />
      </div>
      <div className="grid gap-1.5">
        <div className="flex items-start gap-2">
          <Checkbox
            id="signup-terms"
            name="terms"
            className="mt-0.5"
            aria-invalid={e.terms ? true : undefined}
            aria-describedby={e.terms ? "signup-terms-error" : undefined}
          />
          <Label htmlFor="signup-terms" className="font-normal leading-snug">
            I agree to the Terms and the Privacy Policy.
          </Label>
        </div>
        {e.terms ? (
          <p id="signup-terms-error" role="alert" className="text-xs font-medium text-destructive">
            {e.terms}
          </p>
        ) : null}
      </div>
      <SubmitButton pending={pending}>Create account</SubmitButton>
    </form>
  );
}
