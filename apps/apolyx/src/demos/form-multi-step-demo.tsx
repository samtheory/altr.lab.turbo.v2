"use client";

import * as React from "react";
import {
  Button,
  Field,
  FieldInput,
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  List,
  ListItem,
  ListItemContent,
  ListItemDescription,
  ListItemTitle,
  ListItemTrailing,
  MaskedInput,
  PasswordInput,
  Timeline,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
  applyMask,
  masks,
  parseMask,
  toast,
} from "@altr/apolyx";

import { EMAIL, SubmitButton, idle, useFormAction, wait, type FormState } from "./form-shared";

const CODE = "424242";
const steps = ["Account", "Verify", "Profile", "Review"] as const;

type Answers = { email: string; password: string; name: string; phone: string };
type Errors = Partial<Record<keyof Answers | "code", string>>;

const empty: Answers = { email: "", password: "", name: "", phone: "" };
const phoneParts = parseMask(masks.phoneUS);

export default function FormMultiStepDemo() {
  const [step, setStep] = React.useState(1);
  const [answers, setAnswers] = React.useState<Answers>(empty);
  const [errors, setErrors] = React.useState<Errors>({});
  const [code, setCode] = React.useState("");
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const stepRef = React.useRef<HTMLDivElement>(null);
  const firstRender = React.useRef(true);

  React.useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  React.useEffect(() => {
    if (Object.keys(errors).length === 0) return;
    stepRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [errors]);

  const goTo = (next: number) => {
    setErrors({});
    setStep(next);
  };

  const next = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const errs: Errors = {};
    if (step === 1) {
      if (!EMAIL.test(data.email ?? "")) errs.email = "Enter a valid email.";
      if ((data.password ?? "").length < 8) errs.password = "Use at least 8 characters.";
    }
    if (step === 2 && code !== CODE) errs.code = "That code didn't match. Try 424242.";
    if (step === 3 && !data.name?.trim()) errs.name = "Enter your name.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setAnswers((a) => ({ ...a, ...data }));
    goTo(step + 1);
  };

  const finish = useFormAction(async (): Promise<FormState> => {
    await wait(800);
    toast.success(`Account created for ${answers.email}`);
    setAnswers(empty);
    setCode("");
    goTo(1);
    return idle;
  }, idle);

  const back =
    step > 1 ? (
      <Button type="button" variant="ghost" onClick={() => goTo(step - 1)}>
        Back
      </Button>
    ) : (
      <span />
    );

  const review: { label: string; value: string; step: number }[] = [
    { label: "Email", value: answers.email, step: 1 },
    { label: "Password", value: "•".repeat(answers.password.length), step: 1 },
    { label: "Name", value: answers.name, step: 3 },
    { label: "Phone", value: answers.phone ? applyMask(answers.phone, phoneParts) : "Not added", step: 3 },
  ];

  return (
    <div ref={stepRef} className="grid w-full max-w-md gap-6">
      <Timeline orientation="horizontal" size="sm" value={step - 1} aria-label="Sign-up progress">
        {steps.map((title, i) => (
          <TimelineItem key={title} step={i + 1} aria-current={step === i + 1 ? "step" : undefined}>
            <TimelineSeparator />
            <TimelineIndicator />
            <TimelineHeader>
              <TimelineTitle>{title}</TimelineTitle>
            </TimelineHeader>
          </TimelineItem>
        ))}
      </Timeline>

      <h3 ref={headingRef} tabIndex={-1} className="text-base font-semibold outline-none">
        Step {step} of {steps.length}: {steps[step - 1]}
      </h3>

      {step === 1 ? (
        <form onSubmit={next} noValidate className="grid gap-5">
          <Field label="Email" error={errors.email}>
            <FieldInput name="email" type="email" autoComplete="email" defaultValue={answers.email} />
          </Field>
          <Field label="Password" description="At least 8 characters." error={errors.password}>
            <PasswordInput name="password" autoComplete="new-password" defaultValue={answers.password} />
          </Field>
          <div className="flex justify-between">
            {back}
            <Button type="submit">Continue</Button>
          </div>
        </form>
      ) : null}

      {step === 2 ? (
        <form onSubmit={next} noValidate className="grid gap-5">
          <Field label="Code" description={`We sent a code to ${answers.email}.`} error={errors.code}>
            <InputOTP maxLength={6} value={code} onValueChange={setCode}>
              <InputOTPGroup>
                {Array.from({ length: 6 }, (_, i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </Field>
          <div className="flex justify-between">
            {back}
            <Button type="submit" disabled={code.length < 6}>
              Verify
            </Button>
          </div>
        </form>
      ) : null}

      {step === 3 ? (
        <form onSubmit={next} noValidate className="grid gap-5">
          <Field label="Full name" error={errors.name}>
            <FieldInput name="name" autoComplete="name" defaultValue={answers.name} />
          </Field>
          <Field label="Phone" optional>
            <MaskedInput name="phone" mask={masks.phoneUS} defaultValue={answers.phone} autoComplete="tel-national" />
          </Field>
          <div className="flex justify-between">
            {back}
            <Button type="submit">Review</Button>
          </div>
        </form>
      ) : null}

      {step === 4 ? (
        <form onSubmit={finish.onSubmit} className="grid gap-5">
          <List variant="divided">
            {review.map((r) => (
              <ListItem key={r.label}>
                <ListItemContent>
                  <ListItemTitle>{r.label}</ListItemTitle>
                  <ListItemDescription>{r.value}</ListItemDescription>
                </ListItemContent>
                <ListItemTrailing>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label={`Edit ${r.label.toLowerCase()}`}
                    onClick={() => goTo(r.step)}
                  >
                    Edit
                  </Button>
                </ListItemTrailing>
              </ListItem>
            ))}
          </List>
          <div className="flex justify-between">
            {back}
            <SubmitButton pending={finish.pending}>Create account</SubmitButton>
          </div>
        </form>
      ) : null}
    </div>
  );
}
