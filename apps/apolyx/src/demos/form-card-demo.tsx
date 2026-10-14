"use client";

import * as React from "react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Field,
  FieldInput,
  PasswordInput,
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

export default function FormCardDemo() {
  const { state, pending, onSubmit } = useFormAction(async (_: FormState, data: FormData): Promise<FormState> => {
    await wait(700);
    const v = formValues(data);
    const errors: FormState["errors"] = {};
    if (!EMAIL.test(v.email ?? "")) errors.email = "Enter the email you signed up with.";
    if (!v.password) errors.password = "Enter your password.";
    if (Object.keys(errors).length) return { status: "error", errors };
    toast.success("Signed in");
    return idle;
  }, idle);
  const formRef = React.useRef<HTMLFormElement>(null);
  useFocusFirstInvalid(formRef, state);

  return (
    <Card className="w-full max-w-sm">
      <form ref={formRef} onSubmit={onSubmit} noValidate>
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Welcome back to Apolyx.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <Field label="Email" error={state.errors.email}>
            <FieldInput name="email" type="email" autoComplete="email" />
          </Field>
          <Field
            label="Password"
            error={state.errors.password}
            labelAside={
              <a href="#" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
                Forgot?
              </a>
            }
          >
            <PasswordInput name="password" autoComplete="current-password" />
          </Field>
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-2">
          <SubmitButton pending={pending}>Sign in</SubmitButton>
          <Button type="button" variant="ghost">
            Create an account
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
